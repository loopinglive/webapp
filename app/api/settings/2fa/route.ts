import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { generateRecoveryCodes, generateSecret, otpauthUri, verifyCode } from "@/lib/auth/totp";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * 2FA for a regular account — same TOTP machinery as the super admin console
 * (lib/auth/totp.ts, the totp_* columns on user_accounts), gated by
 * getUserAccount() instead of requireSuperAdmin() so any signed-in host can
 * turn it on, not just platform admins. Deliberately a separate route rather
 * than widening app/api/superadmin/2fa's own gate — that file protects a
 * console that can issue refunds and impersonate customers, and is not worth
 * the regression risk of touching for this.
 */

const hashCode = (code: string) =>
  createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");

export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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

export async function POST() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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
  await supabase.from("user_accounts").update({ totp_secret: secret, totp_last_step: null }).eq("id", account.id);

  const uri = otpauthUri(secret, account.email);
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });

  return NextResponse.json({ secret, uri, qr });
}

const confirmSchema = z.object({ code: z.string().min(6).max(10) });

export async function PUT(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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
    return NextResponse.json({ error: "Start again — there is no enrolment in progress." }, { status: 400 });
  }

  const { valid, step } = verifyCode(data.totp_secret, parsed.data.code);
  if (!valid) {
    return NextResponse.json(
      { error: "That code is not right. Check your phone's clock is correct." },
      { status: 400 }
    );
  }

  const codes = generateRecoveryCodes();

  await supabase
    .from("user_accounts")
    .update({
      totp_enabled_at: new Date().toISOString(),
      totp_recovery_hashes: codes.map(hashCode),
      totp_last_step: step,
    })
    .eq("id", account.id);

  await logAudit({ action: "user.2fa_enabled", resourceType: "user_account", resourceId: account.id, userId: account.id, request });

  return NextResponse.json({ enabled: true, recoveryCodes: codes });
}

const disableSchema = z.object({ code: z.string().min(6).max(20) });

export async function DELETE(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const limit = rateLimit(`2fa-off:${account.id}`, { limit: 6, windowSeconds: 60 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  const parsed = disableSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "A current code, or a recovery code, is required." }, { status: 422 });
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
  const fresh = valid && step !== null && step !== data.totp_last_step;
  const viaRecovery = (data.totp_recovery_hashes ?? []).includes(hashCode(supplied));

  if (!fresh && !viaRecovery) {
    return NextResponse.json({ error: "That code is not right." }, { status: 400 });
  }

  await supabase
    .from("user_accounts")
    .update({ totp_secret: null, totp_enabled_at: null, totp_recovery_hashes: null, totp_last_step: null })
    .eq("id", account.id);

  await logAudit({
    action: "user.2fa_disabled",
    resourceType: "user_account",
    resourceId: account.id,
    userId: account.id,
    newValue: { viaRecovery },
    request,
  });

  return NextResponse.json({ enabled: false });
}
