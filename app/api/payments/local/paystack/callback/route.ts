import { NextResponse } from "next/server";

import { activatePlan } from "@/lib/billing/activate-plan";
import type { PlanSlug } from "@/lib/billing/plans";
import { SITE } from "@/lib/constants";
import { claimPaymentIntent } from "@/lib/payments/intents";
import { verifyPaystackTransaction } from "@/lib/payments/paystack";

export const dynamic = "force-dynamic";

/**
 * Where the browser lands after Paystack's hosted checkout.
 *
 * Verifies and activates inline rather than waiting for the webhook, so the
 * host sees their plan active the moment they're redirected back — the
 * webhook still fires and is harmless, since claimPaymentIntent only lets
 * whichever of the two arrives first actually activate anything.
 */
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference");
  if (!reference) return NextResponse.redirect(`${SITE.url}/upgrade?failed=true`);

  try {
    const verified = await verifyPaystackTransaction(reference);
    if (!verified.ok) return NextResponse.redirect(`${SITE.url}/upgrade?failed=true`);

    const claimed = await claimPaymentIntent("paystack", reference);
    if (claimed) {
      await activatePlan({
        userId: claimed.userId,
        planSlug: claimed.planSlug as PlanSlug,
        source: "paystack",
        amount: claimed.amount,
        currency: claimed.currency,
        providerReference: reference,
      });
    }

    return NextResponse.redirect(`${SITE.url}/dashboard?upgraded=true`);
  } catch {
    return NextResponse.redirect(`${SITE.url}/upgrade?failed=true`);
  }
}
