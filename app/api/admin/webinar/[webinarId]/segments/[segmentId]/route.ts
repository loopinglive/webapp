import { NextResponse } from "next/server";
import { refreshSegment } from "@/lib/intelligence/segments-engine";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

/** Recomputes membership against current registrant data — a dynamic segment is only useful if it stays current. */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; segmentId: string }> }
) {
  const { webinarId, segmentId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  // refreshSegment trusts segmentId alone -- confirm it actually belongs to
  // this webinar before handing it a segment id from someone else's.
  const { data: segment } = await supabase
    .from("smart_segments")
    .select("id")
    .eq("id", segmentId)
    .eq("webinar_id", webinarId)
    .maybeSingle();
  if (!segment) return NextResponse.json({ error: "Segment not found." }, { status: 404 });

  try {
    const count = await refreshSegment(supabase, segmentId);
    return NextResponse.json({ registrantCount: count });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; segmentId: string }> }
) {
  const { webinarId, segmentId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("smart_segments")
    .delete()
    .eq("id", segmentId)
    .eq("webinar_id", webinarId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
