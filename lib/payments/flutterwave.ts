import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Flutterwave — broader African coverage than Paystack (Kenya, Uganda,
 * Tanzania, plus Nigeria/Ghana/South Africa).
 */

const BASE_URL = "https://api.flutterwave.com/v3";

function secretKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error("FLUTTERWAVE_SECRET_KEY is not configured.");
  return key;
}

export function flutterwaveConfigured(): boolean {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
}

export type FlutterwaveInitResult = { link: string; txRef: string };

export async function createFlutterwavePayment(params: {
  email: string;
  amountMajorUnits: number;
  currency: string;
  redirectUrl: string;
  meta: Record<string, string>;
}): Promise<FlutterwaveInitResult> {
  const txRef = `loopinglive_${params.meta.userId ?? "guest"}_${Date.now()}`;

  const response = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: params.amountMajorUnits,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: { email: params.email },
      payment_options: "card,mobilemoney,ussd,banktransfer",
      meta: params.meta,
    }),
  });

  const payload = (await response.json()) as {
    status: string;
    message: string;
    data?: { link: string };
  };

  if (!response.ok || payload.status !== "success" || !payload.data) {
    throw new Error(payload.message || "Flutterwave could not start that payment.");
  }

  return { link: payload.data.link, txRef };
}

export type FlutterwaveVerifyResult = {
  ok: boolean;
  amountMajorUnits: number;
  currency: string;
  txRef: string;
  meta: Record<string, string>;
};

/** `transactionId` is the numeric `transaction_id` Flutterwave appends to the redirect URL. */
export async function verifyFlutterwaveTransaction(transactionId: string): Promise<FlutterwaveVerifyResult> {
  const response = await fetch(`${BASE_URL}/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });

  const payload = (await response.json()) as {
    status: string;
    data?: {
      status: string;
      amount: number;
      currency: string;
      tx_ref: string;
      meta: Record<string, string> | null;
    };
  };

  if (!response.ok || payload.status !== "success" || !payload.data) {
    return { ok: false, amountMajorUnits: 0, currency: "", txRef: "", meta: {} };
  }

  return {
    ok: payload.data.status === "successful",
    amountMajorUnits: payload.data.amount,
    currency: payload.data.currency,
    txRef: payload.data.tx_ref,
    meta: payload.data.meta ?? {},
  };
}

/**
 * Flutterwave webhooks aren't HMAC-signed — the `verif-hash` header is a
 * static secret you set in the Flutterwave dashboard, echoed back verbatim.
 * Still worth comparing in constant time to avoid a timing side-channel.
 */
export function verifyFlutterwaveWebhookHash(providedHash: string | null): boolean {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!secret || !providedHash) return false;
  const a = Buffer.from(secret, "utf8");
  const b = Buffer.from(providedHash, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
