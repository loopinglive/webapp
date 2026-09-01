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
};

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
