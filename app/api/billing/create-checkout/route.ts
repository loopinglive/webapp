import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { PAID_PLANS, stripePriceId, type PlanSlug } from "@/lib/billing/plans";
import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!billingConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured on this deployment." },
      { status: 503 }
    );
  }

  const account = await getUserAccount();
  if (!account) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (account.is_suspended) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const { planSlug, couponCode } = (await request.json()) as {
    planSlug?: string;
    couponCode?: string;
  };

  if (!planSlug || !PAID_PLANS.includes(planSlug as PlanSlug)) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
  }

  const priceId = stripePriceId(planSlug as PlanSlug);
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price is configured for the ${planSlug} plan.` },
      { status: 503 }
    );
  }

  const service = createServiceClient();

  // Create the customer now if signup could not.
  let customerId = account.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: account.email,
      name: account.full_name,
      metadata: { userId: account.id },
    });
    customerId = customer.id;
    await service
      .from("user_accounts")
      .update({ stripe_customer_id: customerId })
      .eq("id", account.id);
  }

  // Validate the coupon here rather than trusting the client — the code that
  // reaches Stripe must be one we have actually approved for this plan.
  const discounts: { coupon: string }[] = [];
  const code = (couponCode ?? "").trim().toUpperCase();
  if (code) {
    const { data: coupon } = await service
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    const appliesTo = (coupon?.applies_to as string[] | null) ?? [];
    const usable =
      coupon &&
      coupon.stripe_coupon_id &&
      (appliesTo.length === 0 || appliesTo.includes(planSlug)) &&
      (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
      (coupon.max_uses === null || (coupon.uses_count ?? 0) < coupon.max_uses);

    if (!usable) {
      return NextResponse.json(
        { error: "That coupon code is not valid for this plan." },
        { status: 400 }
      );
    }
    discounts.push({ coupon: coupon!.stripe_coupon_id! });
  }

  const session = await stripe().checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Lifetime is a one-off payment; the others are subscriptions.
    mode: planSlug === "lifetime" ? "payment" : "subscription",
    success_url: `${SITE.url}/dashboard?upgraded=true`,
    cancel_url: `${SITE.url}/upgrade?cancelled=true`,
    ...(discounts.length ? { discounts } : { allow_promotion_codes: true }),
    // The webhook reads these — it is the only thing that grants a plan.
    metadata: { userId: account.id, planSlug, couponCode: code },
    ...(planSlug !== "lifetime"
      ? { subscription_data: { metadata: { userId: account.id, planSlug } } }
      : {}),
    billing_address_collection: "auto",
    customer_update: { address: "auto", name: "auto" },
  });

  return NextResponse.json({ url: session.url });
}
