import "server-only";

/**
 * M-Pesa via Safaricom's Daraja API — Kenya, Tanzania, Uganda.
 *
 * Uses the sandbox host unless MPESA_ENV=production is set, since a wrong
 * host is the single easiest way to burn a support afternoon on this
 * integration. Daraja does not sign its STK callback the way Paystack or
 * Razorpay sign theirs — there is no HMAC header to verify. Its security
 * model is a secret, unguessable callback URL; treat MPESA_CALLBACK_PATH_SECRET
 * as sensitive and never log the full callback URL.
 */

function apiHost(): string {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export function mpesaConfigured(): boolean {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE &&
      process.env.MPESA_PASSKEY
  );
}

async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa is not configured.");

  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");
  const response = await fetch(`${apiHost()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  const payload = (await response.json()) as { access_token?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error("Could not authenticate with M-Pesa.");
  }
  return payload.access_token;
}

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

export type MpesaStkResult = { merchantRequestId: string; checkoutRequestId: string };

/**
 * Prompts the customer's phone directly — no redirect. `phoneNumber` must be
 * in 2547XXXXXXXX format (no leading +). The customer enters their PIN on
 * their phone; the result arrives later at MPESA_CALLBACK_URL, not in this
 * response — this response only confirms the prompt was sent.
 */
export async function initiateMpesaStkPush(params: {
  phoneNumber: string;
  amountMajorUnits: number;
  accountReference: string;
  transactionDesc: string;
}): Promise<MpesaStkResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!shortcode || !passkey || !callbackUrl) throw new Error("M-Pesa is not configured.");

  const accessToken = await getAccessToken();
  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");

  const response = await fetch(`${apiHost()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(params.amountMajorUnits),
      PartyA: params.phoneNumber,
      PartyB: shortcode,
      PhoneNumber: params.phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: params.accountReference,
      TransactionDesc: params.transactionDesc,
    }),
  });

  const payload = (await response.json()) as {
    ResponseCode?: string;
    ResponseDescription?: string;
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    errorMessage?: string;
  };

  if (!response.ok || payload.ResponseCode !== "0" || !payload.CheckoutRequestID) {
    throw new Error(payload.errorMessage || payload.ResponseDescription || "M-Pesa could not send that prompt.");
  }

  return {
    merchantRequestId: payload.MerchantRequestID!,
    checkoutRequestId: payload.CheckoutRequestID,
  };
}

export type MpesaCallbackResult = {
  checkoutRequestId: string;
  success: boolean;
  amountMajorUnits: number | null;
  mpesaReceiptNumber: string | null;
};

/** Parses the body Safaricom POSTs to MPESA_CALLBACK_URL once the customer responds. */
export function parseMpesaCallback(body: unknown): MpesaCallbackResult | null {
  const stkCallback = (body as {
    Body?: {
      stkCallback?: {
        CheckoutRequestID?: string;
        ResultCode?: number;
        CallbackMetadata?: { Item?: Array<{ Name: string; Value: string | number }> };
      };
    };
  })?.Body?.stkCallback;

  if (!stkCallback?.CheckoutRequestID) return null;

  const items = stkCallback.CallbackMetadata?.Item ?? [];
  const find = (name: string) => items.find((item) => item.Name === name)?.Value;

  return {
    checkoutRequestId: stkCallback.CheckoutRequestID,
    success: stkCallback.ResultCode === 0,
    amountMajorUnits: stkCallback.ResultCode === 0 ? Number(find("Amount")) || null : null,
    mpesaReceiptNumber: stkCallback.ResultCode === 0 ? String(find("MpesaReceiptNumber") ?? "") || null : null,
  };
}
