import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Copies the setup, not the history.
 *
 * Everything the host configured comes across — video, personas, the comment
 * script, engagement, the offer, the AI briefs. Sessions, registrants and chat
 * do not: the clone is a fresh webinar, and it starts as a draft.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { user, response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: source } = await supabase
    .from("webinars")
    .select("*")
    .eq("id", webinarId)
    .maybeSingle();

  if (!source) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  const { data: clone, error } = await supabase
    .from("webinars")
    .insert({
      owner_id: user.id,
      title: `${source.title} (copy)`,
      description: source.description,
      topic: source.topic,
      offer_description: source.offer_description,
      webinar_context: source.webinar_context,
      key_talking_points: source.key_talking_points,
      objection_notes: source.objection_notes,
      video_url: source.video_url,
      video_public_id: source.video_public_id,
      video_duration_seconds: source.video_duration_seconds,
      thumbnail_url: source.thumbnail_url,
      status: "draft",
      is_active: false,
      clone_of: source.id,
    })
    .select("id")
    .single();

  if (error || !clone) {
    return NextResponse.json(
      { error: error?.message ?? "Could not clone." },
      { status: 500 }
    );
  }

  // Personas first — the comments point at them, so they need the new ids.
  const { data: personas } = await supabase
    .from("fake_personas")
    .select("*")
    .eq("webinar_id", webinarId);

  const personaIdMap = new Map<string, string>();

  if (personas?.length) {
    const { data: inserted } = await supabase
      .from("fake_personas")
      .insert(
        personas.map((persona) => ({
          webinar_id: clone.id,
          name: persona.name,
          avatar_url: persona.avatar_url,
          location: persona.location,
        }))
      )
      .select("id, name");

    // Names are unique enough within one webinar's cast to re-link on.
    for (const persona of personas) {
      const match = inserted?.find((row) => row.name === persona.name);
      if (match) personaIdMap.set(persona.id, match.id);
    }
  }

  const { data: comments } = await supabase
    .from("timed_comments")
    .select("*")
    .eq("webinar_id", webinarId);

  if (comments?.length) {
    const rows = comments
      .map((comment) => {
        const personaId = personaIdMap.get(comment.persona_id);
        if (!personaId) return null;
        return {
          webinar_id: clone.id,
          persona_id: personaId,
          content: comment.content,
          video_offset_seconds: comment.video_offset_seconds,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length) await supabase.from("timed_comments").insert(rows);
  }

  await Promise.all([
    copy(supabase, "webinar_offers", webinarId, clone.id),
    copy(supabase, "timed_polls", webinarId, clone.id),
    copy(supabase, "timed_handouts", webinarId, clone.id),
    copy(supabase, "timed_ctas", webinarId, clone.id),
    copy(supabase, "timed_pinned_messages", webinarId, clone.id),
    copy(supabase, "ai_personas", webinarId, clone.id),
  ]);

  return NextResponse.json({ webinarId: clone.id });
}

type Client = ReturnType<typeof createServiceClient>;

/** Re-inserts a webinar's rows under a new webinar id, dropping id/created_at. */
async function copy(
  supabase: Client,
  table:
    | "webinar_offers"
    | "timed_polls"
    | "timed_handouts"
    | "timed_ctas"
    | "timed_pinned_messages"
    | "ai_personas",
  fromWebinarId: string,
  toWebinarId: string
) {
  const { data } = await supabase
    .from(table)
    .select("*")
    .eq("webinar_id", fromWebinarId);

  if (!data?.length) return;

  const rows = data.map((row) => {
    const copied = { ...row, webinar_id: toWebinarId } as Record<string, unknown>;
    delete copied.id;
    delete copied.created_at;
    return copied;
  });

  await supabase.from(table).insert(rows as never);
}
