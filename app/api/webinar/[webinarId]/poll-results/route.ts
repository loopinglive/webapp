import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * A poll's standings.
 *
 * Two shapes, because two people are asking different questions. An attendee
 * wants to know how *their room* answered, which is scoped to their session —
 * an aggregate across every session ever run would show them a consensus that
 * nobody in the room with them expressed. A host wants the aggregate, because
 * that is the question the poll was written to answer.
 *
 * The aggregate goes through `poll_results()` rather than selecting rows: a
 * poll in a thousand-person room would otherwise ship a thousand rows to
 * render four bars.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const url = new URL(request.url);
  const pollId = url.searchParams.get("pollId");
  const sessionId = url.searchParams.get("sessionId");

  if (!pollId) {
    return NextResponse.json({ error: "pollId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // The poll has to belong to this webinar, or any poll id in the database
  // would be readable through any webinar's URL.
  const { data: poll } = await supabase
    .from("timed_polls")
    .select("id")
    .eq("id", pollId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  if (sessionId) {
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

  const { data } = await supabase.rpc("poll_results", { p_poll_id: pollId });
  const rows = data ?? [];

  return NextResponse.json({
    results: rows,
    total: rows.reduce((sum, row) => sum + row.votes, 0),
  });
}
