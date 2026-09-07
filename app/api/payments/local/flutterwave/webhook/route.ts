import { NextResponse } from "next/server";

import { activatePlan } from "@/lib/billing/activate-plan";
import type { PlanSlug } from "@/lib/billing/plans";
import { claimPaymentIntent } from "@/lib/payments/intents";
import { verifyFlutterwaveWebhookHash } from "@/lib/payments/flutterwave";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!verifyFlutterwaveWebhookHash(request.headers.get("verif-hash"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = (await request.json()) as {
    event?: string;
    data?: { status: string; tx_ref: string; amount: number; currency: string };
  };

  if (event.data?.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  const claimed = await claimPaymentIntent("flutterwave", event.data.tx_ref);
  if (claimed) {
    await activatePlan({
      userId: claimed.userId,
      planSlug: claimed.planSlug as PlanSlug,
      source: "flutterwave",
      amount: claimed.amount,
      currency: claimed.currency,
      providerReference: event.data.tx_ref,
    });
  }

  return NextResponse.json({ received: true });
}
