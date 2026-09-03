import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type WebinarUpdate = Database["public"]["Tables"]["webinars"]["Update"];

// Only these are editable from the setup UI. Video fields go through the upload
// confirm route so the durations stay server-verified.
const EDITABLE: Record<string, keyof WebinarUpdate> = {
  title: "title",
  description: "description",
  topic: "topic",
  offerDescription: "offer_description",
  webinarContext: "webinar_context",
  keyTalkingPoints: "key_talking_points",
  objectionNotes: "objection_notes",
  thumbnailUrl: "thumbnail_url",
  // How the session is labelled to attendees. Both columns have existed since
  // Phase 10 with nothing reading or writing them.
  broadcastLabel: "broadcast_label",
  showRecordedNotice: "show_recorded_notice",
};

/** The labels a host may pick. Free text here would be a claim we cannot check. */
const BROADCAST_LABELS = new Set(["live", "encore", "replay", "workshop"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  const patch: WebinarUpdate = { updated_at: new Date().toISOString() };

  for (const [key, column] of Object.entries(EDITABLE)) {
    if (!(key in body)) continue;
    const value = body[key];
    // Trim strings, and treat an emptied field as cleared rather than "".
    (patch as Record<string, unknown>)[column] =
      typeof value === "string" ? value.trim() || null : value;
  }

  if (typeof patch.title === "string" && !patch.title) {
    return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
  }

  if (
    patch.broadcast_label !== undefined &&
    !BROADCAST_LABELS.has(String(patch.broadcast_label))
  ) {
    return NextResponse.json(
      { error: "That is not a broadcast label we support." },
      { status: 422 }
    );
  }

  // The boolean would otherwise be nulled by the empty-string rule above.
  if ("showRecordedNotice" in body) {
    patch.show_recorded_notice = Boolean(body.showRecordedNotice);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("webinars")
    .update(patch)
    .eq("id", webinarId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ webinar: data });
}
