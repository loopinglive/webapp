import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { PAID_PLANS, type PlanSlug } from "@/lib/billing/plans";
import { SITE } from "@/lib/constants";
import { createPaymentIntent } from "@/lib/payments/intents";
import { createPaystackTransaction, paystackConfigured } from "@/lib/payments/paystack";
import { countryFromRequest } from "@/lib/payments/geo";
import { getLocalisedPricing, priceForPlan, standardPriceForPlan } from "@/lib/payments/pricing";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!paystackConfigured()) {
    return NextResponse.json({ error: "Paystack is not configured on this deployment." }, { status: 503 });
  }

  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { planSlug } = (await request.json()) as { planSlug?: string };
  if (!planSlug || !PAID_PLANS.includes(planSlug as PlanSlug)) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
  }

  // Price is re-derived server-side from the visitor's own detected country —
  // never trusted from the request body, so a client can't ask to pay the
  // Nigeria price from a US IP.
  const country = countryFromRequest(request);
  const pricing = await getLocalisedPricing(country);
  const price = priceForPlan(pricing, planSlug as PlanSlug) ?? standardPriceForPlan(planSlug as PlanSlug);

  if (!price) {
    return NextResponse.json({ error: "That plan has no price to charge." }, { status: 400 });
  }

  try {
    const transaction = await createPaystackTransaction({
      email: account.email,
      amountMajorUnits: price.amount,
      currency: price.currency,
      callbackUrl: `${SITE.url}/api/payments/local/paystack/callback`,
      metadata: { userId: account.id, planSlug },
    });

    await createPaymentIntent({
      provider: "paystack",
      providerReference: transaction.reference,
      userId: account.id,
      planSlug: planSlug as PlanSlug,
      amount: price.amount,
      currency: price.currency,
    });

    return NextResponse.json({ url: transaction.authorizationUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start that payment." },
      { status: 502 }
    );
  }
}
