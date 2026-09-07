import { requireWebinarAccess } from "@/lib/webinar-access";
import { NextResponse } from "next/server";
import { z } from "zod";

import { generatePersonaProfiles, generateTimedComments } from "@/lib/anthropic";
import { checkClaims } from "@/lib/claim-check";
import { captionsUrl } from "@/lib/cloudinary-urls";
import { PRESET_AVATARS } from "@/lib/preset-avatars";
import { createServiceClient } from "@/lib/supabase/server";
import { bucketCues, parseVtt } from "@/lib/vtt";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  count: z.number().int().min(1).max(20).default(6),
  brief: z.string().max(500).optional(),
  generateComments: z.boolean().default(false),
  commentsPerPersona: z.number().int().min(1).max(10).default(5),
});

/**
 * Generates a batch of believable chat personas with Claude and inserts them
 * straight into fake_personas — the same table the manual "New persona" form
 * and CSV import write to, so nothing downstream needs to know these were
 * AI-generated. A row in ai_generated_personas keeps an audit trail of the
 * generation itself (prompt, count, niche) without duplicating persona data.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, topic, video_public_id, video_duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) return NextResponse.json({ error: "Webinar not found" }, { status: 404 });

  const profiles = await generatePersonaProfiles({
    webinarTitle: webinar.title,
    webinarTopic: webinar.topic ?? "",
    count: parsed.data.count,
    brief: parsed.data.brief,
  });

  if (!profiles.length) {
    return NextResponse.json({ error: "The model did not return any personas. Try again." }, { status: 502 });
  }

  const rows = profiles.map((profile, index) => ({
    webinar_id: webinarId,
    name: profile.name,
    location: profile.location,
    avatar_url: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
    _brief: profile.personalityBrief, // not persisted — see ai_generated_personas insert below
    _index: index,
  }));

  const { data: inserted, error } = await supabase
    .from("fake_personas")
    .insert(rows.map(({ webinar_id, name, location, avatar_url }) => ({ webinar_id, name, location, avatar_url })))
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("ai_generated_personas").insert({
    webinar_id: webinarId,
    generation_prompt: parsed.data.brief ?? null,
    generated_count: inserted?.length ?? 0,
    niche: webinar.topic ?? null,
    locations: profiles.map((profile) => profile.location),
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  let commentsGenerated = 0;
  let commentsSkippedError: string | null = null;

  // Best-effort: personas are already saved, so a transcript problem here
  // should never turn a successful persona batch into an error response.
  if (parsed.data.generateComments && webinar.video_public_id) {
    try {
      const transcriptResponse = await fetch(captionsUrl(webinar.video_public_id));
      if (transcriptResponse.ok) {
        const vtt = await transcriptResponse.text();
        const transcript = bucketCues(parseVtt(vtt), 30);

        if (transcript.length > 0 && inserted?.length) {
          const proposals = await generateTimedComments({
            transcript,
            personas: inserted.map((persona) => ({ id: persona.id, name: persona.name })),
            webinarTitle: webinar.title,
            webinarTopic: webinar.topic ?? webinar.title,
            durationSeconds: webinar.video_duration_seconds ?? 0,
            count: parsed.data.commentsPerPersona * inserted.length,
          });

          // Same claim-check pass a hand-typed or manually-reviewed generated
          // comment gets -- a flagged line is dropped rather than saved
          // unreviewed, since this path skips the proposal-review step the
          // standalone Comments tab has.
          const safe = proposals.filter((p) => checkClaims(p.content).length === 0);

          if (safe.length > 0) {
            const { error: commentsError } = await supabase.from("timed_comments").insert(
              safe.map((p) => ({
                webinar_id: webinarId,
                persona_id: p.personaId,
                content: p.content,
                video_offset_seconds: p.offsetSeconds,
              }))
            );
            if (!commentsError) commentsGenerated = safe.length;
          }
        }
      } else {
        commentsSkippedError = "No transcript is available for this video yet.";
      }
    } catch {
      commentsSkippedError = "Could not generate comments for these personas.";
    }
  } else if (parsed.data.generateComments && !webinar.video_public_id) {
    commentsSkippedError = "Upload a video first — there is nothing to transcribe yet.";
  }

  return NextResponse.json({ personas: inserted ?? [], commentsGenerated, commentsSkippedError });
}
