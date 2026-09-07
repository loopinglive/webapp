import { NextResponse } from "next/server";

import { activatePlan } from "@/lib/billing/activate-plan";
import type { PlanSlug } from "@/lib/billing/plans";
import { SITE } from "@/lib/constants";
import { verifyFlutterwaveTransaction } from "@/lib/payments/flutterwave";
import { claimPaymentIntent } from "@/lib/payments/intents";

export const dynamic = "force-dynamic";

/** Flutterwave appends transaction_id, tx_ref and status to the redirect URL. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const transactionId = params.get("transaction_id");
  const txRef = params.get("tx_ref");

  if (!transactionId || !txRef || params.get("status") === "cancelled") {
    return NextResponse.redirect(`${SITE.url}/upgrade?failed=true`);
  }

  try {
    const verified = await verifyFlutterwaveTransaction(transactionId);
    if (!verified.ok || verified.txRef !== txRef) {
      return NextResponse.redirect(`${SITE.url}/upgrade?failed=true`);
    }

    const claimed = await claimPaymentIntent("flutterwave", txRef);
    if (claimed) {
      await activatePlan({
        userId: claimed.userId,
        planSlug: claimed.planSlug as PlanSlug,
        source: "flutterwave",
        amount: claimed.amount,
        currency: claimed.currency,
        providerReference: txRef,
      });
    }

    return NextResponse.redirect(`${SITE.url}/dashboard?upgraded=true`);
  } catch {
    return NextResponse.redirect(`${SITE.url}/upgrade?failed=true`);
  }
}
