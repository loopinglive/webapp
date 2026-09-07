import { NextResponse } from "next/server";

import { activatePlan } from "@/lib/billing/activate-plan";
import type { PlanSlug } from "@/lib/billing/plans";
import { claimPaymentIntent } from "@/lib/payments/intents";
import { verifyRazorpayWebhookSignature } from "@/lib/payments/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpayWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; status: string } } };
  };

  const payment = event.payload?.payment?.entity;
  if (event.event !== "payment.captured" || !payment || payment.status !== "captured") {
    return NextResponse.json({ received: true });
  }

  const claimed = await claimPaymentIntent("razorpay", payment.order_id);
  if (claimed) {
    await activatePlan({
      userId: claimed.userId,
      planSlug: claimed.planSlug as PlanSlug,
      source: "razorpay",
      amount: claimed.amount,
      currency: claimed.currency,
      providerReference: payment.id,
    });
  }

  return NextResponse.json({ received: true });
}
