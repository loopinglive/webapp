import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Drops every scripted persona comment that is due at `elapsedSeconds` into the
 * session's chat.
 *
 * Viewers all call this as their playhead crosses a comment's offset, so it has
 * to be idempotent — the unique (session_id, timed_comment_id) constraint plus
 * ON CONFLICT DO NOTHING means the row lands exactly once and Realtime fans it
 * out to everyone. It also backfills, so the first viewer to arrive twenty
 * minutes in still sees the twenty minutes of chat that "already happened".
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const { sessionId, elapsedSeconds } = (await request.json()) as {
    sessionId?: string;
    elapsedSeconds?: number;
  };

  if (!sessionId || typeof elapsedSeconds !== "number") {
    return NextResponse.json(
      { error: "sessionId and elapsedSeconds are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("id, starts_at, webinar_id")
    .eq("id", sessionId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: due, error: dueError } = await supabase
    .from("timed_comments")
    .select("id, persona_id, content, video_offset_seconds")
    .eq("webinar_id", webinarId)
    .lte("video_offset_seconds", Math.floor(elapsedSeconds))
    .order("video_offset_seconds", { ascending: true });

  if (dueError) {
    return NextResponse.json({ error: dueError.message }, { status: 500 });
  }
  if (!due?.length) {
    return NextResponse.json({ inserted: 0 });
  }

  const { data: personaRows } = await supabase
    .from("fake_personas")
    .select("id, name, avatar_url, location")
    .eq("webinar_id", webinarId);

  const personas = new Map((personaRows ?? []).map((row) => [row.id, row]));
  const startsAt = new Date(session.starts_at).getTime();

  const rows = due.map((comment) => {
    // Rule 2: a persona comment carries the wall-clock time it would have been
    // sent live — session start plus its video offset, not now().
    const persona = personas.get(comment.persona_id);

    return {
      session_id: sessionId,
      sender_name: persona?.name ?? "Guest",
      sender_avatar: persona?.avatar_url ?? null,
      sender_location: persona?.location ?? null,
      is_fake: true,
      is_real_user: false,
      timed_comment_id: comment.id,
      content: comment.content,
      sent_at: new Date(
        startsAt + comment.video_offset_seconds * 1000
      ).toISOString(),
    };
  });

  const { data: inserted, error } = await supabase
    .from("live_chat_messages")
    .upsert(rows, {
      onConflict: "session_id,timed_comment_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: inserted?.length ?? 0 });
}
