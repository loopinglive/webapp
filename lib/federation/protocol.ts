import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The federation wire protocol: how two instances prove requests to each
 * other.
 *
 * Every request carries three headers:
 *   X-Federation-Key        the plaintext key the receiving side issued
 *   X-Federation-Timestamp  unix seconds, rejected outside a 5-minute window
 *   X-Federation-Signature  HMAC-SHA256(timestamp + "." + rawBody, key)
 *
 * The key alone would authenticate but not bind the request: a proxy could
 * replay a captured body forever, or alter it. Signing the timestamp with
 * the body closes both, and comparing digests with timingSafeEqual keeps the
 * check from leaking position information byte by byte.
 *
 * Stored keys are HMACed with FEDERATION_SIGNING_SECRET rather than plain
 * SHA-256, so a leaked database on its own does not let an attacker verify
 * candidate keys offline. That secret is required — with it unset federation
 * refuses to operate rather than silently falling back to a weaker hash.
 *
 * Untestable end-to-end here, honestly: it takes a second live instance to
 * exercise, exactly like the SAML SSO work in Phase 14. What IS verifiable
 * without one is the local half — key issuance, hashing, signature
 * construction and verification — and /api/federation/verify exists so a host
 * can prove the link works against a real partner before trusting it.
 */

const KEY_PREFIX = "llf_";
const MAX_SKEW_SECONDS = 300;

export function federationConfigured(): boolean {
  return Boolean(process.env.FEDERATION_SIGNING_SECRET?.trim());
}

function signingSecret(): string {
  const secret = process.env.FEDERATION_SIGNING_SECRET?.trim();
  if (!secret) throw new Error("Federation is not configured on this deployment.");
  return secret;
}

/** A key for a partner to call us with. Plaintext is returned once and never stored. */
export function generateFederationKey(): { key: string; hash: string } {
  const key = `${KEY_PREFIX}${randomBytes(32).toString("hex")}`;
  return { key, hash: hashFederationKey(key) };
}

export function hashFederationKey(key: string): string {
  return createHmac("sha256", signingSecret()).update(key).digest("hex");
}

export function signPayload(key: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", key).update(`${timestamp}.${rawBody}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type VerificationFailure = { ok: false; status: number; error: string };
export type VerificationSuccess = { ok: true; keyHash: string };

/** Checks a request came from the holder of a key we issued, unmodified and recently. */
export function verifyInbound(headers: Headers, rawBody: string): VerificationSuccess | VerificationFailure {
  if (!federationConfigured()) return { ok: false, status: 503, error: "Federation is not configured." };

  const key = headers.get("x-federation-key");
  const timestamp = headers.get("x-federation-timestamp");
  const signature = headers.get("x-federation-signature");

  if (!key || !timestamp || !signature) {
    return { ok: false, status: 401, error: "Missing federation credentials." };
  }

  const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(skew) || skew > MAX_SKEW_SECONDS) {
    return { ok: false, status: 401, error: "Request timestamp is outside the accepted window." };
  }

  if (!safeEqual(signature, signPayload(key, timestamp, rawBody))) {
    return { ok: false, status: 401, error: "Signature does not match." };
  }

  return { ok: true, keyHash: hashFederationKey(key) };
}

export type FederationAction = "ping" | "audience_share" | "analytics_summary";

/** Calls a partner instance with the key they issued us. */
export async function callPartner(input: {
  partnerUrl: string;
  partnerKey: string;
  action: FederationAction;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number; body: unknown }> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify({ action: input.action, payload: input.payload });

  const response = await fetch(`${input.partnerUrl.replace(/\/$/, "")}/api/federation/inbound`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Federation-Key": input.partnerKey,
      "X-Federation-Timestamp": timestamp,
      "X-Federation-Signature": signPayload(input.partnerKey, timestamp, rawBody),
    },
    body: rawBody,
  });

  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}
