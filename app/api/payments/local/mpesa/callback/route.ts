import { NextResponse } from "next/server";

import { activatePlan } from "@/lib/billing/activate-plan";
import type { PlanSlug } from "@/lib/billing/plans";
import { claimPaymentIntent } from "@/lib/payments/intents";
import { parseMpesaCallback } from "@/lib/payments/mpesa";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Safaricom's own callback — no signature to verify (see lib/payments/mpesa.ts).
 * Always answers 200 with ResultCode 0 regardless of outcome, per Daraja's own
 * contract: a non-200 or malformed response makes Safaricom retry the same
 * callback repeatedly.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = parseMpesaCallback(body);

  if (!result) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  if (!result.success) {
    await createServiceClient()
      .from("local_payment_intents")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("provider", "mpesa")
      .eq("provider_reference", result.checkoutRequestId)
      .eq("status", "pending");

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const claimed = await claimPaymentIntent("mpesa", result.checkoutRequestId);
  if (claimed) {
    await activatePlan({
      userId: claimed.userId,
      planSlug: claimed.planSlug as PlanSlug,
      source: "mpesa",
      amount: result.amountMajorUnits ?? claimed.amount,
      currency: claimed.currency,
      providerReference: result.mpesaReceiptNumber ?? result.checkoutRequestId,
    });
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
