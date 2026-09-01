import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { logEvent, syncSegment } from "@/lib/attendee-tracking";
import { handlePurchase } from "@/lib/messaging/scheduler";
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

  // Buyers leave every sequence and get a receipt instead.
  const { data: row } = await supabase
    .from("registrants")
    .select("webinar_id, session_id")
    .eq("id", registrantId)
    .maybeSingle();

  if (row) {
    await handlePurchase(supabase, {
      webinarId: row.webinar_id,
      registrantId,
      sessionId: row.session_id,
    });
  }

  return NextResponse.json({ success: true, segment });
}
