import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { generateTimedComments } from "@/lib/anthropic";
import { checkClaims } from "@/lib/claim-check";
import { captionsUrl } from "@/lib/cloudinary-urls";
import { bucketCues, parseVtt } from "@/lib/vtt";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  count: z.number().int().min(1).max(25).default(15),
});

/**
 * Proposes timed comments from the video's transcript.
 *
 * Writing thirty by hand is the dullest part of setup and the one most likely
 * to be skipped, which is what leaves a chat feeling empty rather than lived
 * in. Returns drafts only — nothing is written to timed_comments here. A host
 * reviews, edits or discards each line before it can appear in a real room,
 * exactly the review a hand-typed comment already gets from the claim-check
 * pass in the editor.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured on this deployment." },
      { status: 503 }
    );
  }

  const { webinarId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  const count = parsed.success ? parsed.data.count : 15;

  const supabase = createServiceClient();

  const [{ data: webinar }, { data: personas }] = await Promise.all([
    supabase
      .from("webinars")
      .select("title, topic, video_public_id, video_duration_seconds")
      .eq("id", webinarId)
      .maybeSingle(),
    supabase
      .from("fake_personas")
      .select("id, name")
      .eq("webinar_id", webinarId),
  ]);

  if (!webinar?.video_public_id) {
    return NextResponse.json(
      { error: "Upload a video first — there is nothing to transcribe yet." },
      { status: 400 }
    );
  }
  if (!personas?.length) {
    return NextResponse.json(
      { error: "Create at least one persona first — someone has to say it." },
      { status: 400 }
    );
  }

  const transcriptResponse = await fetch(captionsUrl(webinar.video_public_id)).catch(
    () => null
  );

  if (!transcriptResponse?.ok) {
    return NextResponse.json(
      {
        error:
          "No transcript is available for this video yet. Auto-transcription can take a few minutes after upload — try again shortly.",
      },
      { status: 404 }
    );
  }

  const vtt = await transcriptResponse.text();
  const cues = parseVtt(vtt);
  const transcript = bucketCues(cues, 30);

  if (transcript.length === 0) {
    return NextResponse.json(
      { error: "The transcript came back empty." },
      { status: 422 }
    );
  }

  const proposals = await generateTimedComments({
    transcript,
    personas,
    webinarTitle: webinar.title,
    webinarTopic: webinar.topic ?? webinar.title,
    durationSeconds: webinar.video_duration_seconds ?? 0,
    count,
  });

  if (proposals.length === 0) {
    return NextResponse.json(
      { error: "Could not generate anything usable from this transcript." },
      { status: 502 }
    );
  }

  // Each proposal gets the same pass a hand-typed comment gets in the editor,
  // so a generated line that reads as an earnings claim or a testimonial is
  // flagged before a host skims past it in a batch of fifteen.
  return NextResponse.json({
    proposals: proposals.map((proposal) => ({
      ...proposal,
      flags: checkClaims(proposal.content),
    })),
  });
}
