import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Symmetric encryption for credentials at rest (SMTP password, Cele.bio
 * tokens) — never a plaintext secret in a database row.
 *
 * Keyed off SUPABASE_SERVICE_ROLE_KEY rather than a new env var: that value
 * is already a server-only secret nobody else has, so this needs no
 * additional configuration to work on any deployment that already has
 * billing wired up. AES-256-GCM: authenticated, so a tampered ciphertext
 * fails to decrypt rather than silently returning garbage.
 */
function key() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((buf) => buf.toString("base64")).join(".");
}

export function decryptSecret(stored: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = stored.split(".");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
