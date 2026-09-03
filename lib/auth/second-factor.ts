import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Remembering that this browser has already passed the second factor.
 *
 * A signed cookie rather than a database session: it is one bit of state that
 * has to be read on every admin page load, and a row lookup for "did they
 * already type a code" is a query per page for something a signature answers
 * for free.
 *
 * Signed with the service role key, which is already the secret that would
 * have to leak for any of this to matter. A separate secret would be better
 * hygiene and would also be one more environment variable to lose.
 */
const COOKIE = "loopinglive_2fa";

/**
 * Twelve hours.
 *
 * Long enough that an admin working through a day is asked once. Short enough
 * that a laptop left open overnight in a shared office does not stay
 * authenticated into the next day, which is the situation this is actually
 * defending against far more often than a stolen password.
 */
const TTL_SECONDS = 12 * 60 * 60;

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "insecure-development-secret";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** The value to store: who it is for, when it expires, and a signature. */
export function mintToken(userId: string, atMs = Date.now()) {
  const expires = Math.floor(atMs / 1000) + TTL_SECONDS;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function tokenIsValid(
  token: string | undefined,
  userId: string,
  atMs = Date.now()
): boolean {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [subject, expiresAt, signature] = parts;
  const payload = `${subject}.${expiresAt}`;

  const expected = Buffer.from(sign(payload));
  const supplied = Buffer.from(signature);

  // Constant-time, and length-checked first because timingSafeEqual throws on
  // a length mismatch rather than returning false.
  if (expected.length !== supplied.length) return false;
  if (!timingSafeEqual(expected, supplied)) return false;

  // The signature only proves the payload is ours. It still has to be for this
  // person and still be in date — otherwise one admin's cookie would admit
  // another, and an expired one would admit anybody who kept it.
  if (subject !== userId) return false;
  if (Number(expiresAt) * 1000 < atMs) return false;

  return true;
}

/** Whether this browser has already passed the second factor for this admin. */
export async function hasPassedSecondFactor(userId: string) {
  const store = await cookies();
  return tokenIsValid(store.get(COOKIE)?.value, userId);
}

export const SECOND_FACTOR_COOKIE = COOKIE;
export const SECOND_FACTOR_TTL_SECONDS = TTL_SECONDS;
