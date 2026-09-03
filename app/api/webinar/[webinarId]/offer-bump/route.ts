import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The active bump on this webinar's offer, if it has priced checkout at all. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: offer } = await supabase
    .from("webinar_offers")
    .select("id, price_cents")
    .eq("webinar_id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  // No priced offer, no bump worth offering — a bump on an external checkout
  // has nothing to attach to.
  if (!offer || !offer.price_cents) {
    return NextResponse.json({ bump: null });
  }

  const { data: bump } = await supabase
    .from("webinar_offer_bumps")
    .select("id, title, description, price_cents, currency")
    .eq("offer_id", offer.id)
    .eq("is_active", true)
    .maybeSingle();

  return NextResponse.json({ bump: bump ?? null });
}
