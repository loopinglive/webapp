import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Everything the signed-in user has bought, newest first. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: purchases } = await supabase
    .from("marketplace_purchases")
    .select("id, listing_id, amount_paid, purchased_at")
    .eq("buyer_id", account.id)
    .order("purchased_at", { ascending: false });

  const listingIds = (purchases ?? []).map((purchase) => purchase.listing_id);
  const { data: listings } = listingIds.length
    ? await supabase
        .from("marketplace_listings")
        .select("id, title, thumbnail_url, listing_type")
        .in("id", listingIds)
    : { data: [] };

  const byId = new Map((listings ?? []).map((listing) => [listing.id, listing]));

  return NextResponse.json({
    purchases: (purchases ?? []).map((purchase) => ({
      ...purchase,
      listing: byId.get(purchase.listing_id) ?? null,
    })),
  });
}
