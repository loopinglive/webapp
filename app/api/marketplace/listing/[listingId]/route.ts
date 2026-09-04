import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** One listing, its seller, its reviews, and whether the viewer already owns it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params;
  const supabase = createServiceClient();

  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("id", listingId)
    .eq("is_approved", true)
    .eq("is_active", true)
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const [{ data: seller }, { data: reviews }] = await Promise.all([
    supabase
      .from("marketplace_seller_profiles")
      .select("display_name, avatar_url, bio, total_sales, average_rating")
      .eq("user_id", listing.seller_id)
      .maybeSingle(),
    supabase
      .from("marketplace_reviews")
      .select("id, rating, title, body, created_at, reviewer_id")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const account = await getUserAccount();
  let owned = false;
  if (account) {
    const { data: purchase } = await supabase
      .from("marketplace_purchases")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", account.id)
      .maybeSingle();
    owned = Boolean(purchase);
  }

  return NextResponse.json({ listing, seller, reviews: reviews ?? [], owned });
}
