import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/** Razorpay — India. UPI, cards, net banking, wallets. */

const BASE_URL = "https://api.razorpay.com/v1";

function credentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay is not configured.");
  return { keyId, keySecret };
}

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export type RazorpayOrder = { orderId: string; amountPaise: number; keyId: string };

/**
 * Creates an order server-side. The client then opens Razorpay's own
 * Checkout widget (checkout.js) against this order id — Razorpay is a modal,
 * not a redirect, unlike Paystack/Flutterwave.
 */
export async function createRazorpayOrder(params: {
  amountMajorUnits: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const amountPaise = Math.round(params.amountMajorUnits * 100);

  const response = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    }),
  });

  const payload = (await response.json()) as { id?: string; error?: { description: string } };
  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.description || "Razorpay could not create that order.");
  }

  return { orderId: payload.id, amountPaise, keyId };
}

/**
 * Verifies the signature Checkout's client-side success handler hands back —
 * HMAC-SHA256 of `orderId|paymentId` with the key secret. This confirms the
 * payment belongs to this order; it is not a substitute for the webhook,
 * which is the source of truth for actually granting the plan.
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The webhook secret is configured separately from the API key secret, in Razorpay's dashboard. */
export function verifyRazorpayWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
