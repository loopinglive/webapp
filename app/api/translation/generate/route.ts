import { NextResponse } from "next/server";
import { z } from "zod";

import type { ScriptSection } from "@/lib/anthropic";
import { SUPPORTED_TARGET_LANGUAGES, deeplConfigured, translateTexts } from "@/lib/translation/deepl";
import { deepgramConfigured, transcribeAudioUrl } from "@/lib/translation/deepgram";
import { requireWebinarAccess } from "@/lib/webinar-access";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

const VALID_CODES = new Set(SUPPORTED_TARGET_LANGUAGES.map((language) => language.code));
const MAX_LANGUAGES_PER_RUN = 6;

const schema = z.object({
  webinarId: z.string().uuid(),
  targetLanguages: z.array(z.string()).min(1).max(MAX_LANGUAGES_PER_RUN),
});

type SourceSegment = { text: string; startSeconds: number; endSeconds: number };

/**
 * Builds the source (untranslated) caption segments for a webinar's video.
 * The script — already written text with per-section timing — is preferred
 * over running speech-to-text on the video, since almost every webinar here
 * has one (script writer or the autonomous pipeline); Deepgram only comes in
 * for a video with no script at all.
 */
async function buildSourceSegments(
  webinarId: string,
  scriptId: string | null,
  videoUrl: string | null,
  videoDurationSeconds: number | null
): Promise<SourceSegment[]> {
  const supabase = createServiceClient();

  if (scriptId) {
    const { data: scriptRow } = await supabase.from("webinar_scripts").select("script_content").eq("id", scriptId).maybeSingle();
    const sections = ((scriptRow?.script_content as { sections?: ScriptSection[] } | null)?.sections ?? []).filter(
      (section) => section.content.trim().length > 0
    );
    if (sections.length === 0) return [];

    // Prefer the real per-slide durations the autonomous pipeline recorded
    // (accurate to the actual narration) over a naive estimate split.
    const { data: presentation } = await supabase
      .from("ai_presentations")
      .select("slides")
      .eq("webinar_id", webinarId)
      .maybeSingle();
    const slideDurations = new Map(
      ((presentation?.slides as { sectionKey: string; durationSeconds?: number }[] | null) ?? []).map((slide) => [
        slide.sectionKey,
        slide.durationSeconds,
      ])
    );

    const totalEstimatedMinutes = sections.reduce((sum, section) => sum + Math.max(section.estimatedMinutes, 0.5), 0);
    let cursor = 0;
    return sections.map((section) => {
      const stripped = section.content.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
      const duration =
        slideDurations.get(section.key) ??
        (videoDurationSeconds
          ? (Math.max(section.estimatedMinutes, 0.5) / totalEstimatedMinutes) * videoDurationSeconds
          : Math.max(section.estimatedMinutes, 0.5) * 60);
      const segment = { text: stripped, startSeconds: cursor, endSeconds: cursor + duration };
      cursor += duration;
      return segment;
    }).filter((segment) => segment.text.length > 0);
  }

  if (videoUrl) {
    if (!deepgramConfigured()) {
      throw new Error("This webinar has no script, and transcription isn't configured on this deployment.");
    }
    const utterances = await transcribeAudioUrl(videoUrl);
    return utterances
      .filter((utterance) => utterance.text.trim().length > 0)
      .map((utterance) => ({ text: utterance.text, startSeconds: utterance.startSeconds, endSeconds: utterance.endSeconds }));
  }

  return [];
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const { webinarId, targetLanguages } = parsed.data;

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  if (!deeplConfigured()) {
    return NextResponse.json({ error: "Translation is not configured on this deployment." }, { status: 503 });
  }

  const codes = [...new Set(targetLanguages.map((code) => code.toUpperCase()))];
  const invalid = codes.filter((code) => !VALID_CODES.has(code as never));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Unsupported language: ${invalid.join(", ")}` }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("script_id, video_url, video_duration_seconds, primary_language")
    .eq("id", webinarId)
    .maybeSingle();
  if (!webinar) return NextResponse.json({ error: "Webinar not found" }, { status: 404 });

  let segments: SourceSegment[];
  try {
    segments = await buildSourceSegments(webinarId, webinar.script_id, webinar.video_url, webinar.video_duration_seconds);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read this webinar's content." }, { status: 502 });
  }

  if (segments.length === 0) {
    return NextResponse.json({ error: "This webinar has no script or video to translate yet." }, { status: 400 });
  }

  const sourceLanguage = (webinar.primary_language || "en").toUpperCase();
  const sourceTexts = segments.map((segment) => segment.text);

  const translationsByLanguage = new Map<string, string[]>();
  for (const code of codes) {
    try {
      translationsByLanguage.set(code, await translateTexts(sourceTexts, code, sourceLanguage));
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : `Could not translate into ${code}.` },
        { status: 502 }
      );
    }
  }

  await supabase.from("translation_segments").delete().eq("webinar_id", webinarId);

  const rows = segments.map((segment, index) => ({
    webinar_id: webinarId,
    original_text: segment.text,
    translations: Object.fromEntries(codes.map((code) => [code, translationsByLanguage.get(code)?.[index] ?? ""])) as Json,
    start_time_seconds: Math.round(segment.startSeconds * 10) / 10,
    end_time_seconds: Math.round(segment.endSeconds * 10) / 10,
    speaker: "host",
  }));

  const { error: insertError } = await supabase.from("translation_segments").insert(rows);
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await supabase.from("real_time_translations").delete().eq("webinar_id", webinarId);
  await supabase.from("real_time_translations").insert({
    webinar_id: webinarId,
    source_language: sourceLanguage,
    target_languages: codes as unknown as Json,
    transcription_provider: webinar.script_id ? "script" : "deepgram",
    translation_provider: "deepl",
    is_active: true,
  });

  return NextResponse.json({ segmentCount: rows.length, languages: codes });
}
