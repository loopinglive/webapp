import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { refreshSegment } from "@/lib/intelligence/segments-engine";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Recomputes membership against current registrant data — a dynamic segment is only useful if it stays current. */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; segmentId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { segmentId } = await params;

  try {
    const count = await refreshSegment(createServiceClient(), segmentId);
    return NextResponse.json({ registrantCount: count });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; segmentId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId, segmentId } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("smart_segments")
    .delete()
    .eq("id", segmentId)
    .eq("webinar_id", webinarId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
