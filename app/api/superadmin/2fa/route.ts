import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/billing/account";
import {
  generateRecoveryCodes,
  generateSecret,
  otpauthUri,
  verifyCode,
} from "@/lib/auth/totp";
import { rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const hashCode = (code: string) =>
  createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");

/** Whether this admin has it on, and how many recovery codes are left. */
export async function GET() {
  const { account, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { data } = await createServiceClient()
    .from("user_accounts")
    .select("totp_enabled_at, totp_recovery_hashes")
    .eq("id", account.id)
    .maybeSingle();

  return NextResponse.json({
    enabled: Boolean(data?.totp_enabled_at),
    enabledAt: data?.totp_enabled_at ?? null,
    recoveryCodesLeft: data?.totp_recovery_hashes?.length ?? 0,
  });
}

/**
 * Starts enrolment.
 *
 * The secret is stored immediately but `totp_enabled_at` stays null, so it is
 * not yet enforced. Enrolment is only finished once they prove they can
 * produce a code — otherwise a mistyped scan locks an admin out of the console
 * with no way back in.
 */
export async function POST() {
  const { account, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("user_accounts")
    .select("totp_enabled_at")
    .eq("id", account.id)
    .maybeSingle();

  if (existing?.totp_enabled_at) {
    return NextResponse.json(
      { error: "Two-factor is already on. Turn it off first to re-enrol." },
      { status: 400 }
    );
  }

  const secret = generateSecret();

  await supabase
    .from("user_accounts")
    .update({ totp_secret: secret, totp_last_step: null })
    .eq("id", account.id);

  const uri = otpauthUri(secret, account.email);

  /*
   * The QR as a data URI, rendered here rather than in the browser.
   *
   * It encodes the shared secret, so sending it to a third-party chart service
   * — which is how this is usually done — would hand that secret to someone
   * else. Generating it server-side keeps it between us and the admin.
   */
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });

  return NextResponse.json({ secret, uri, qr });
}

const confirmSchema = z.object({
  code: z.string().min(6).max(10),
});

/** Finishes enrolment, and hands back the recovery codes once. */
export async function PUT(request: Request) {
  const { account, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  // Six tries a minute. Enough for a fumbled code; not enough to walk the
  // million possibilities.
  const limit = rateLimit(`2fa:${account.id}`, { limit: 6, windowSeconds: 60 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  const parsed = confirmSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the six-digit code." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data } = await supabase
    .from("user_accounts")
    .select("totp_secret, totp_enabled_at")
    .eq("id", account.id)
    .maybeSingle();

  if (!data?.totp_secret) {
    return NextResponse.json(
      { error: "Start again — there is no enrolment in progress." },
      { status: 400 }
    );
  }

  const { valid, step } = verifyCode(data.totp_secret, parsed.data.code);
  if (!valid) {
    return NextResponse.json(
      { error: "That code is not right. Check your phone's clock is correct." },
      { status: 400 }
    );
  }

  /*
   * Recovery codes, shown exactly once.
   *
   * A phone is lost or wiped far more often than a password is stolen, and an
   * admin locked out of the console with no way back is a worse outcome than
   * the risk these carry. Only their hashes are kept.
   */
  const codes = generateRecoveryCodes();

  await supabase
    .from("user_accounts")
    .update({
      totp_enabled_at: new Date().toISOString(),
      totp_recovery_hashes: codes.map(hashCode),
      totp_last_step: step,
    })
    .eq("id", account.id);

  await supabase.from("admin_actions").insert({
    admin_id: account.id,
    action: "2fa_enabled",
    detail: {} as never,
  });

  return NextResponse.json({ enabled: true, recoveryCodes: codes });
}

const disableSchema = z.object({
  code: z.string().min(6).max(20),
});

/**
 * Turns it off, and requires a current code to do so.
 *
 * Without that, anyone who reaches an already-signed-in session can remove the
 * second factor, which makes it a speed bump rather than a control. A recovery
 * code is accepted here for the same reason it exists.
 */
export async function DELETE(request: Request) {
  const { account, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const limit = rateLimit(`2fa-off:${account.id}`, { limit: 6, windowSeconds: 60 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  const parsed = disableSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A current code, or a recovery code, is required." },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();

  const { data } = await supabase
    .from("user_accounts")
    .select("totp_secret, totp_enabled_at, totp_recovery_hashes, totp_last_step")
    .eq("id", account.id)
    .maybeSingle();

  if (!data?.totp_enabled_at || !data.totp_secret) {
    return NextResponse.json({ error: "It is not on." }, { status: 400 });
  }

  const supplied = parsed.data.code;
  const { valid, step } = verifyCode(data.totp_secret, supplied);

  // A code already used cannot be used again — see totp_last_step.
  const fresh = valid && step !== null && step !== data.totp_last_step;
  const viaRecovery = (data.totp_recovery_hashes ?? []).includes(hashCode(supplied));

  if (!fresh && !viaRecovery) {
    return NextResponse.json({ error: "That code is not right." }, { status: 400 });
  }

  await supabase
    .from("user_accounts")
    .update({
      totp_secret: null,
      totp_enabled_at: null,
      totp_recovery_hashes: null,
      totp_last_step: null,
    })
    .eq("id", account.id);

  await supabase.from("admin_actions").insert({
    admin_id: account.id,
    action: "2fa_disabled",
    detail: { viaRecovery } as never,
  });

  return NextResponse.json({ enabled: false });
}
