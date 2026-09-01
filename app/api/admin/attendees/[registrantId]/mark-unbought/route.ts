import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { syncSegment } from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ registrantId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { registrantId } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("registrants")
    .update({ bought: false, bought_at: null, manually_marked_bought: false })
    .eq("id", registrantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The sale is being retracted, so the revenue goes with it.
  await supabase.from("purchases").delete().eq("registrant_id", registrantId);

  // Falls back to whatever their behaviour actually earned.
  const segment = await syncSegment(supabase, registrantId);

  return NextResponse.json({ success: true, segment });
}
