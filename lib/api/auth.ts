import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/server";

const PREFIX = "ll_live_";

/**
 * Generates an API key.
 *
 * 32 bytes of CSPRNG output, hex-encoded. The plaintext is returned once and
 * never stored — only the SHA-256 digest goes to the database.
 */
export function generateApiKey() {
  const secret = randomBytes(32).toString("hex");
  const key = `${PREFIX}${secret}`;
  return {
    key,
    hash: hashApiKey(key),
    // Enough to recognise a key in a list, far too little to reconstruct it.
    prefix: key.slice(0, PREFIX.length + 6),
  };
}

/**
 * SHA-256, deliberately, where a password would use bcrypt.
 *
 * A password is low-entropy and needs a slow hash to survive an offline
 * attack. An API key is 256 random bits — there is no dictionary to try. What
 * a fast hash buys is a single indexed lookup on every request, instead of
 * loading every active key and running bcrypt against each one.
 */
export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export type ApiActor = {
  userId: string;
  keyId: string;
  email: string;
  planSlug: string;
};

export type ApiAuthResult =
  | { ok: true; actor: ApiActor }
  | { ok: false; status: 401 | 403; error: string };

/** Authenticates a request carrying `Authorization: Bearer ll_live_…`. */
export async function authenticateApiKey(request: Request): Promise<ApiAuthResult> {
  const header = request.headers.get("authorization") ?? "";

  if (!header.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token." };
  }

  const key = header.slice("Bearer ".length).trim();
  if (!key.startsWith(PREFIX)) {
    return { ok: false, status: 401, error: "Malformed API key." };
  }

  const supabase = createServiceClient();

  const { data: record } = await supabase
    .from("api_keys")
    .select("id, user_id, is_active, expires_at")
    .eq("key_hash", hashApiKey(key))
    .maybeSingle();

  if (!record || !record.is_active) {
    return { ok: false, status: 401, error: "Invalid or revoked API key." };
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return { ok: false, status: 401, error: "This API key has expired." };
  }

  if (!record.user_id) {
    return { ok: false, status: 401, error: "Invalid or revoked API key." };
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("id, email, plan_slug, is_suspended")
    .eq("id", record.user_id)
    .maybeSingle();

  if (!account) {
    return { ok: false, status: 401, error: "Invalid or revoked API key." };
  }
  if (account.is_suspended) {
    return { ok: false, status: 403, error: "This account is suspended." };
  }

  // Best-effort: a failed timestamp write must not fail the request.
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", record.id)
    .then(() => undefined);

  return {
    ok: true,
    actor: {
      userId: account.id,
      keyId: record.id,
      email: account.email,
      planSlug: account.plan_slug,
    },
  };
}

/** Consistent JSON error shape across every public endpoint. */
export function apiError(status: number, message: string, extra?: object) {
  return Response.json({ error: message, ...extra }, { status });
}

/** Page and limit, clamped so a caller cannot ask for the whole table. */
export function pagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 25) || 25));
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
}
