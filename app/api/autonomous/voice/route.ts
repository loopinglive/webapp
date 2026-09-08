import { NextResponse } from "next/server";

import type { ScriptSection } from "@/lib/anthropic";
import { logStep, markFailed, triggerNextStep, verifyPipelineSecret } from "@/lib/autonomous/pipeline";
import { uploadBuffer } from "@/lib/cloudinary";
import { PREMIUM_VOICES, elevenLabsConfigured, synthesiseSpeech } from "@/lib/voice/elevenlabs";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type UploadedSlide = { sectionKey: string; title: string; bullets: string[]; publicId: string; url: string; durationSeconds?: number };

/**
 * Synthesises one clip per script section and uploads each separately.
 * Splicing them into one narration track happens in the assemble step, next
 * to the slide-image splice it mirrors — kept together there rather than
 * split across two routes with two copies of the same Cloudinary logic.
 */
export async function POST(request: Request) {
  if (!verifyPipelineSecret(request)) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const { autonomousWebinarId } = (await request.json().catch(() => ({}))) as { autonomousWebinarId?: string };
  if (!autonomousWebinarId) return NextResponse.json({ error: "autonomousWebinarId is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: job } = await supabase
    .from("autonomous_webinars")
    .select("id, webinar_id, user_id, config")
    .eq("id", autonomousWebinarId)
    .maybeSingle();

  if (!job || !job.webinar_id) return NextResponse.json({ error: "Generation job not found." }, { status: 404 });

  await logStep(autonomousWebinarId, "voice", "running");

  if (!elevenLabsConfigured()) {
    await markFailed(autonomousWebinarId, "voice", "Voice synthesis is not configured on this deployment (no ElevenLabs API key).");
    return NextResponse.json({ error: "Voice synthesis is not configured." }, { status: 503 });
  }

  try {
    const config = job.config as { voiceId?: string | null; voiceCloneId?: string | null };

    let voiceId = config.voiceId;
    if (config.voiceCloneId) {
      const { data: clone } = await supabase
        .from("voice_clones")
        .select("provider_voice_id, status")
        .eq("id", config.voiceCloneId)
        .maybeSingle();
      if (clone?.status === "ready") voiceId = clone.provider_voice_id;
    }
    voiceId = voiceId || PREMIUM_VOICES[0].id;

    const { data: webinar } = await supabase.from("webinars").select("script_id").eq("id", job.webinar_id).maybeSingle();
    const { data: scriptRow } = await supabase
      .from("webinar_scripts")
      .select("script_content")
      .eq("id", webinar?.script_id ?? "")
      .maybeSingle();

    const sections = ((scriptRow?.script_content as { sections?: ScriptSection[] } | null)?.sections ?? []) as ScriptSection[];
    const spoken = sections.filter((section) => section.content.trim().length > 0);
    if (spoken.length === 0) throw new Error("No script content to synthesise.");

    const clips: Array<{ sectionKey: string; publicId: string; durationSeconds: number }> = [];

    for (const section of spoken) {
      // Stage directions in [brackets] and chat-engagement prompts are for
      // the presenter, never spoken — stripped before synthesis so the
      // narration doesn't read stage notes aloud.
      const spokenText = section.content.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
      if (!spokenText) continue;

      const audio = await synthesiseSpeech(spokenText, voiceId);
      const uploaded = await uploadBuffer(audio, {
        folder: `autonomous/${autonomousWebinarId}/voice`,
        publicId: section.key,
        resourceType: "video",
      });
      clips.push({
        sectionKey: section.key,
        publicId: uploaded.publicId,
        durationSeconds: uploaded.duration ?? section.estimatedMinutes * 60,
      });
    }

    if (clips.length === 0) throw new Error("Voice synthesis produced no audio clips.");

    // Fold real per-section audio durations into the slide data the
    // presentation step already saved, so video assembly can time each
    // slide to how long it actually takes to say, not an estimate.
    const { data: presentation } = await supabase
      .from("ai_presentations")
      .select("id, slides")
      .eq("webinar_id", job.webinar_id)
      .maybeSingle();

    if (presentation) {
      const durationBySection = new Map(clips.map((clip) => [clip.sectionKey, clip.durationSeconds]));
      const slides = ((presentation.slides as UploadedSlide[] | null) ?? []).map((slide) => ({
        ...slide,
        durationSeconds:
          slide.sectionKey === "_title" ? 5 : slide.sectionKey === "_offer" ? 8 : durationBySection.get(slide.sectionKey) ?? 20,
      }));
      await supabase.from("ai_presentations").update({ slides: slides as unknown as Json }).eq("id", presentation.id);
    }

    await supabase
      .from("autonomous_webinars")
      .update({ config: { ...(job.config as object), narrationClipPublicIds: clips.map((clip) => clip.publicId) } as Json })
      .eq("id", autonomousWebinarId);

    await logStep(autonomousWebinarId, "voice", "complete");
    triggerNextStep("/api/autonomous/assemble", { autonomousWebinarId });
    return NextResponse.json({ success: true, clipCount: clips.length });
  } catch (error) {
    await markFailed(autonomousWebinarId, "voice", error instanceof Error ? error.message : "Voice synthesis failed.");
    return NextResponse.json({ error: "Voice synthesis failed." }, { status: 500 });
  }
}
