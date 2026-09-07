import { NextResponse } from "next/server";
import { z } from "zod";

import { activatePlan } from "@/lib/billing/activate-plan";
import { getUserAccount } from "@/lib/billing/account";
import type { PlanSlug } from "@/lib/billing/plans";
import { claimPaymentIntent, peekPaymentIntent } from "@/lib/payments/intents";
import { verifyRazorpayPaymentSignature } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

/**
 * What Checkout's client-side success handler calls immediately after
 * payment, so the host sees their plan active without waiting for the
 * webhook. The webhook is still the durable path — claimPaymentIntent makes
 * whichever arrives first the one that actually activates anything.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 422 });

  const valid = verifyRazorpayPaymentSignature({
    orderId: parsed.data.razorpay_order_id,
    paymentId: parsed.data.razorpay_payment_id,
    signature: parsed.data.razorpay_signature,
  });

  if (!valid) return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });

  // Checked before claiming: a mismatch here must leave the intent pending
  // for the webhook to activate correctly, not consume it and lose the
  // legitimate activation.
  const intent = await peekPaymentIntent("razorpay", parsed.data.razorpay_order_id);
  if (intent && intent.userId && intent.userId !== account.id) {
    return NextResponse.json({ error: "This order does not belong to you." }, { status: 403 });
  }

  const claimed = await claimPaymentIntent("razorpay", parsed.data.razorpay_order_id);
  if (claimed) {
    await activatePlan({
      userId: claimed.userId,
      planSlug: claimed.planSlug as PlanSlug,
      source: "razorpay",
      amount: claimed.amount,
      currency: claimed.currency,
      providerReference: parsed.data.razorpay_payment_id,
    });
  }

  return NextResponse.json({ success: true });
}
