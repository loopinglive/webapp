import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack — Nigeria, Ghana, South Africa, Kenya.
 *
 * Plain REST over fetch rather than the unofficial `paystack-node` package:
 * Paystack does not publish an official Node SDK, and this is a handful of
 * endpoints against a stable, well-documented API — not enough surface to be
 * worth a third-party dependency this codebase can't verify against a real
 * source of truth.
 */

const BASE_URL = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  return key;
}

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export type PaystackInitResult = { authorizationUrl: string; reference: string };

/**
 * Starts a transaction. `amountMajorUnits` is in the currency's normal unit
 * (dollars, naira) — Paystack wants the smallest unit (kobo/cents), so this
 * multiplies by 100 itself; callers should never pre-convert.
 */
export async function createPaystackTransaction(params: {
  email: string;
  amountMajorUnits: number;
  currency: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<PaystackInitResult> {
  const response = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountMajorUnits * 100),
      currency: params.currency,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
      channels: ["card", "bank", "ussd", "mobile_money", "bank_transfer"],
    }),
  });

  const payload = (await response.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; reference: string };
  };

  if (!response.ok || !payload.status || !payload.data) {
    throw new Error(payload.message || "Paystack could not start that transaction.");
  }

  return { authorizationUrl: payload.data.authorization_url, reference: payload.data.reference };
}

export type PaystackVerifyResult = {
  ok: boolean;
  amountMajorUnits: number;
  currency: string;
  reference: string;
  metadata: Record<string, string>;
};

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResult> {
  const response = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });

  const payload = (await response.json()) as {
    status: boolean;
    data?: {
      status: string;
      amount: number;
      currency: string;
      reference: string;
      metadata: Record<string, string> | null;
    };
  };

  if (!response.ok || !payload.status || !payload.data) {
    return { ok: false, amountMajorUnits: 0, currency: "", reference, metadata: {} };
  }

  return {
    ok: payload.data.status === "success",
    amountMajorUnits: payload.data.amount / 100,
    currency: payload.data.currency,
    reference: payload.data.reference,
    metadata: payload.data.metadata ?? {},
  };
}

/** Paystack signs the raw webhook body with HMAC-SHA512 over the secret key. */
export function verifyPaystackSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signatureHeader, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
