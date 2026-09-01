import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import type { TimedCommentWithPersona } from "@/types";

export const dynamic = "force-dynamic";

// Every scripted comment for a webinar, in offset order. The room loads this
// once and watches the playhead against it.
export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");

  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [{ data, error }, { data: personaRows }] = await Promise.all([
    supabase
      .from("timed_comments")
      .select("*")
      .eq("webinar_id", webinarId)
      .order("video_offset_seconds", { ascending: true }),
    supabase
      .from("fake_personas")
      .select("id, name, avatar_url, location")
      .eq("webinar_id", webinarId),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const personas = new Map((personaRows ?? []).map((row) => [row.id, row]));

  const comments: TimedCommentWithPersona[] = (data ?? []).map((comment) => ({
    ...comment,
    persona: personas.get(comment.persona_id) ?? null,
  }));

  return NextResponse.json({ comments });
}
