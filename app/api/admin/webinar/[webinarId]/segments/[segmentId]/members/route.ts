import { NextResponse } from "next/server";
import { evaluateSegmentMembers } from "@/lib/intelligence/segments-engine";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";
import type { Condition } from "@/lib/intelligence/personalisation";

export const dynamic = "force-dynamic";

/** The actual registrants in a segment, computed live -- for viewing and exporting, not stored as a list. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; segmentId: string }> }
) {
  const { webinarId, segmentId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const supabase = createServiceClient();

  const { data: segment } = await supabase
    .from("smart_segments")
    .select("conditions")
    .eq("id", segmentId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!segment) return NextResponse.json({ error: "Segment not found." }, { status: 404 });

  const members = await evaluateSegmentMembers(supabase, webinarId, segment.conditions as unknown as Condition[]);

  return NextResponse.json({
    members: members.map((m) => ({ id: m.id, full_name: m.full_name, email: m.email })),
  });
}
