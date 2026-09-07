import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { PAID_PLANS, type PlanSlug } from "@/lib/billing/plans";
import { countryFromRequest } from "@/lib/payments/geo";
import { createPaymentIntent } from "@/lib/payments/intents";
import { getLocalisedPricing, priceForPlan, standardPriceForPlan } from "@/lib/payments/pricing";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!razorpayConfigured()) {
    return NextResponse.json({ error: "Razorpay is not configured on this deployment." }, { status: 503 });
  }

  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { planSlug } = (await request.json()) as { planSlug?: string };
  if (!planSlug || !PAID_PLANS.includes(planSlug as PlanSlug)) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
  }

  const country = countryFromRequest(request);
  const pricing = await getLocalisedPricing(country);
  const price = priceForPlan(pricing, planSlug as PlanSlug) ?? standardPriceForPlan(planSlug as PlanSlug);
  if (!price) return NextResponse.json({ error: "That plan has no price to charge." }, { status: 400 });

  try {
    const order = await createRazorpayOrder({
      amountMajorUnits: price.amount,
      currency: price.currency,
      receipt: `${account.id}-${Date.now()}`,
      notes: { userId: account.id, planSlug },
    });

    await createPaymentIntent({
      provider: "razorpay",
      providerReference: order.orderId,
      userId: account.id,
      planSlug: planSlug as PlanSlug,
      amount: price.amount,
      currency: price.currency,
    });

    return NextResponse.json({
      orderId: order.orderId,
      amountPaise: order.amountPaise,
      currency: price.currency,
      keyId: order.keyId,
      name: account.full_name,
      email: account.email,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start that payment." },
      { status: 502 }
    );
  }
}
