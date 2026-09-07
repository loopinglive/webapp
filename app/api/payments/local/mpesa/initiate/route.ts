import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { PAID_PLANS, type PlanSlug } from "@/lib/billing/plans";
import { countryFromRequest } from "@/lib/payments/geo";
import { createPaymentIntent } from "@/lib/payments/intents";
import { initiateMpesaStkPush, mpesaConfigured } from "@/lib/payments/mpesa";
import { getLocalisedPricing, priceForPlan, standardPriceForPlan } from "@/lib/payments/pricing";

export const dynamic = "force-dynamic";

const schema = z.object({
  planSlug: z.string(),
  // 2547XXXXXXXX or 2541XXXXXXXX — Safaricom's own required format, no leading +.
  phoneNumber: z.string().regex(/^254[17]\d{8}$/, "Use the format 2547XXXXXXXX."),
});

export async function POST(request: Request) {
  if (!mpesaConfigured()) {
    return NextResponse.json({ error: "M-Pesa is not configured on this deployment." }, { status: 503 });
  }

  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || !PAID_PLANS.includes(parsed.data.planSlug as PlanSlug)) {
    return NextResponse.json({ error: parsed.success ? "Choose a valid plan." : parsed.error.issues[0]?.message }, { status: 400 });
  }

  const country = countryFromRequest(request);
  const pricing = await getLocalisedPricing(country);
  const price = priceForPlan(pricing, parsed.data.planSlug as PlanSlug) ?? standardPriceForPlan(parsed.data.planSlug as PlanSlug);
  if (!price) return NextResponse.json({ error: "That plan has no price to charge." }, { status: 400 });

  // M-Pesa settles in KES only — a USD or GBP list price can't be sent to
  // the STK push API, so this path only works once a KES localized_pricing
  // row exists for the visitor's country.
  if (price.currency !== "KES") {
    return NextResponse.json({ error: "M-Pesa is only available for KES pricing." }, { status: 400 });
  }

  try {
    const stk = await initiateMpesaStkPush({
      phoneNumber: parsed.data.phoneNumber,
      amountMajorUnits: price.amount,
      accountReference: "Loopinglive",
      transactionDesc: `Loopinglive ${parsed.data.planSlug}`,
    });

    await createPaymentIntent({
      provider: "mpesa",
      providerReference: stk.checkoutRequestId,
      userId: account.id,
      planSlug: parsed.data.planSlug as PlanSlug,
      amount: price.amount,
      currency: price.currency,
    });

    return NextResponse.json({ checkoutRequestId: stk.checkoutRequestId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send that prompt." },
      { status: 502 }
    );
  }
}
