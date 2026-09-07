import { NextResponse } from "next/server";

import { activatePlan } from "@/lib/billing/activate-plan";
import type { PlanSlug } from "@/lib/billing/plans";
import { claimPaymentIntent } from "@/lib/payments/intents";
import { verifyPaystackSignature } from "@/lib/payments/paystack";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    data?: { reference: string; status: string; metadata?: { userId?: string; planSlug?: string } };
  };

  if (event.event !== "charge.success" || event.data?.status !== "success") {
    return NextResponse.json({ received: true });
  }

  const claimed = await claimPaymentIntent("paystack", event.data.reference);
  if (claimed) {
    await activatePlan({
      userId: claimed.userId,
      planSlug: claimed.planSlug as PlanSlug,
      source: "paystack",
      amount: claimed.amount,
      currency: claimed.currency,
      providerReference: event.data.reference,
    });
  }

  return NextResponse.json({ received: true });
}
