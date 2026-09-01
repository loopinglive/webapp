import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Everything the room drops on the video's clock. Loaded once on entry; the
// room decides when each item appears from its own playhead.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const supabase = createServiceClient();

  const [polls, handouts, ctas, pinned] = await Promise.all([
    supabase
      .from("timed_polls")
      .select("*")
      .eq("webinar_id", webinarId)
      .eq("is_active", true)
      .order("video_offset_seconds", { ascending: true }),
    supabase
      .from("timed_handouts")
      .select("*")
      .eq("webinar_id", webinarId)
      .eq("is_active", true)
      .order("video_offset_seconds", { ascending: true }),
    supabase
      .from("timed_ctas")
      .select("*")
      .eq("webinar_id", webinarId)
      .eq("is_active", true)
      .order("video_offset_seconds", { ascending: true }),
    supabase
      .from("timed_pinned_messages")
      .select("*")
      .eq("webinar_id", webinarId)
      .eq("is_active", true)
      .order("video_offset_seconds", { ascending: true }),
  ]);

  return NextResponse.json({
    polls: polls.data ?? [],
    handouts: handouts.data ?? [],
    ctas: ctas.data ?? [],
    pinned: pinned.data ?? [],
  });
}

// A poll answer.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const { pollId, sessionId, registrantId, optionId } =
    (await request.json()) as {
      pollId?: string;
      sessionId?: string;
      registrantId?: string;
      optionId?: string;
    };

  if (!pollId || !sessionId || !registrantId || !optionId) {
    return NextResponse.json(
      { error: "pollId, sessionId, registrantId and optionId are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // The poll has to belong to this webinar — otherwise any poll id would do.
  const { data: poll } = await supabase
    .from("timed_polls")
    .select("id")
    .eq("id", pollId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const { error } = await supabase.from("poll_responses").upsert(
    {
      poll_id: pollId,
      session_id: sessionId,
      registrant_id: registrantId,
      option_id: optionId,
    },
    { onConflict: "poll_id,registrant_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Hand back the running tally so the viewer sees where they landed.
  const { data: responses } = await supabase
    .from("poll_responses")
    .select("option_id")
    .eq("poll_id", pollId)
    .eq("session_id", sessionId);

  const tally: Record<string, number> = {};
  for (const row of responses ?? []) {
    tally[row.option_id] = (tally[row.option_id] ?? 0) + 1;
  }

  return NextResponse.json({ tally, total: responses?.length ?? 0 });
}
