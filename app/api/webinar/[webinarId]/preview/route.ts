import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * A simulated session, for the host to watch their own webinar.
 *
 * Returns the same shape the real session endpoint does, but with a start time
 * computed from an offset the caller chooses rather than from the schedule.
 * Nothing is written: no registrant, no attendance, no analytics. A host
 * previewing must not appear in their own numbers.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const offset = Math.max(
    0,
    Number(new URL(request.url).searchParams.get("offset") ?? 0) || 0
  );

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select(
      "id, title, description, video_url, video_public_id, video_duration_seconds, thumbnail_url"
    )
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "No such webinar." }, { status: 404 });
  }

  // A synthetic session that started `offset` seconds ago, so the player and
  // every timed element behave exactly as they would live.
  const startsAt = new Date(Date.now() - offset * 1000).toISOString();

  const [{ data: comments }, { data: personas }, { data: offer }] = await Promise.all([
    supabase
      .from("timed_comments")
      .select("id, persona_id, content, video_offset_seconds")
      .eq("webinar_id", webinarId)
      .order("video_offset_seconds", { ascending: true }),
    supabase
      .from("fake_personas")
      .select("id, name, avatar_url, location")
      .eq("webinar_id", webinarId),
    supabase
      .from("webinar_offers")
      .select("*")
      .eq("webinar_id", webinarId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const personaById = new Map((personas ?? []).map((p) => [p.id, p]));

  return NextResponse.json({
    preview: true,
    webinar,
    session: { id: "preview", starts_at: startsAt, status: "live" },
    serverTime: new Date().toISOString(),
    comments: (comments ?? []).map((comment) => {
      const persona = personaById.get(comment.persona_id);
      return {
        id: comment.id,
        content: comment.content,
        offsetSeconds: comment.video_offset_seconds,
        senderName: persona?.name ?? "Guest",
        senderAvatar: persona?.avatar_url ?? null,
        senderLocation: persona?.location ?? null,
      };
    }),
    offer,
  });
}
