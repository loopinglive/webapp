import { NextResponse } from "next/server";
import { z } from "zod";

import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { getUserAccount } from "@/lib/billing/account";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({ listingId: z.string().uuid() });

/**
 * The 20% platform fee is computed and recorded on every purchase, but no
 * money actually moves to a seller yet — that needs Stripe Connect, which
 * needs the platform's Stripe account to have Connect enabled and each
 * seller to complete their own onboarding. `marketplace_seller_profiles`
 * already has the columns for it (`stripe_connect_account_id`,
 * `payout_enabled`); routing the split at charge time is the piece that
 * is not built, because it is a platform capability, not application code.
 */
export async function POST(request: Request) {
  if (!billingConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured on this deployment." },
      { status: 503 }
    );
  }

  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Sign in to buy this." }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("id, title, price, currency, seller_id")
    .eq("id", parsed.data.listingId)
    .eq("is_approved", true)
    .eq("is_active", true)
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  if (listing.seller_id === account.id) {
    return NextResponse.json({ error: "You cannot buy your own listing." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("marketplace_purchases")
    .select("id")
    .eq("listing_id", listing.id)
    .eq("buyer_id", account.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You already own this." }, { status: 400 });
  }

  // A free listing is granted outright — there is nothing for Stripe to do,
  // and routing a $0 charge through checkout would just be a confusing extra
  // click in front of something that should be instant.
  if (listing.price <= 0) {
    const { error } = await supabase.from("marketplace_purchases").insert({
      listing_id: listing.id,
      buyer_id: account.id,
      seller_id: listing.seller_id,
      amount_paid: 0,
      platform_fee: 0,
      seller_earnings: 0,
      status: "completed",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ free: true });
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: account.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: (listing.currency || "usd").toLowerCase(),
          unit_amount: Math.round(listing.price * 100),
          product_data: { name: listing.title },
        },
      },
    ],
    success_url: `${SITE.url}/marketplace/listing/${listing.id}?purchased=1`,
    cancel_url: `${SITE.url}/marketplace/listing/${listing.id}`,
    metadata: {
      kind: "marketplace_purchase",
      listingId: listing.id,
      buyerId: account.id,
      sellerId: listing.seller_id ?? "",
    },
  });

  return NextResponse.json({ url: session.url });
}
