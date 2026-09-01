import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { logEvent, syncSegment } from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The one segment an admin sets by hand — for offers sold on an external page,
// where nothing tells us automatically.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ registrantId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { registrantId } = await params;
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("registrants")
    .update({ bought: true, bought_at: now, manually_marked_bought: true })
    .eq("id", registrantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logEvent(supabase, {
    registrantId,
    type: "bought",
    data: { manual: true },
  });

  const segment = await syncSegment(supabase, registrantId);

  return NextResponse.json({ success: true, segment });
}
