import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Time-based one-time passwords, per RFC 6238.
 *
 * Hand-written rather than pulled in as a dependency. The algorithm is thirty
 * lines — an HMAC, a truncation, a modulo — and the parts that are easy to get
 * wrong are the ones a library would not save you from anyway: the comparison
 * has to be constant-time, the window has to be small, and a used code has to
 * be rejected the second time. All three are decisions, not code.
 *
 * The super admin console can issue refunds and impersonate customers, and it
 * has been behind a password alone.
 */

const DIGITS = 6;
const PERIOD_SECONDS = 30;

/**
 * How many 30-second steps either side of now are accepted.
 *
 * One. That is 90 seconds of total validity, which covers a phone whose clock
 * has drifted by a few seconds and someone typing slowly. Three steps is
 * common advice and is too generous: it triples the window an intercepted code
 * stays useful in, to buy tolerance for clock skew that barely exists on a
 * device that syncs time automatically.
 */
const WINDOW = 1;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** A new secret, base32 as authenticator apps expect. */
export function generateSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");

  let secret = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/, "").toUpperCase().replace(/\s/g, "");
  let bits = "";

  for (const character of clean) {
    const index = BASE32.indexOf(character);
    if (index === -1) throw new Error("Invalid base32 in secret");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** The code for one 30-second step. */
function codeForStep(secret: string, step: number): string {
  const key = base32Decode(secret);

  const counter = Buffer.alloc(8);
  // 64-bit big-endian counter. The high word stays zero until the year 5000-odd.
  counter.writeUInt32BE(Math.floor(step / 2 ** 32), 0);
  counter.writeUInt32BE(step >>> 0, 4);

  const digest = createHmac("sha1", key).update(counter).digest();

  // Dynamic truncation, RFC 4226 §5.4.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Checks a code, and says which step matched.
 *
 * The step is returned so the caller can refuse to accept the same one twice —
 * without that, a code shoulder-surfed or read off a screen stays usable for
 * its whole window, which is most of what the window costs you.
 *
 * The comparison is constant-time. A fast reject on the first wrong digit
 * leaks, over enough attempts, which digit was wrong.
 */
export function verifyCode(
  secret: string,
  code: string,
  atMs: number = Date.now()
): { valid: boolean; step: number | null } {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== DIGITS) return { valid: false, step: null };

  const current = Math.floor(atMs / 1000 / PERIOD_SECONDS);
  const supplied = Buffer.from(clean);

  for (let offset = -WINDOW; offset <= WINDOW; offset += 1) {
    const step = current + offset;
    const expected = Buffer.from(codeForStep(secret, step));

    if (
      expected.length === supplied.length &&
      timingSafeEqual(expected, supplied)
    ) {
      return { valid: true, step };
    }
  }

  return { valid: false, step: null };
}

/** The URI an authenticator app scans. */
export function otpauthUri(secret: string, email: string, issuer = "Loopinglive") {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params}`;
}

/**
 * Recovery codes.
 *
 * A phone is lost or wiped far more often than a password is stolen, and an
 * admin locked out of the console with no way back is a worse outcome than the
 * risk these carry. Ten is enough to survive several incidents without
 * becoming a list nobody keeps safe.
 */
export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}
