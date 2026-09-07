import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { SECOND_FACTOR_COOKIE, SECOND_FACTOR_TTL_SECONDS, mintToken } from "@/lib/auth/second-factor";
import { verifyCode } from "@/lib/auth/totp";
import { getUserAccount } from "@/lib/billing/account";
import { rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().min(6).max(20) });

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const limit = rateLimit(`2fa-challenge:${account.id}`, { limit: 10, windowSeconds: 60 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Enter the code." }, { status: 422 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_accounts")
    .select("totp_secret, totp_enabled_at, totp_recovery_hashes, totp_last_step")
    .eq("id", account.id)
    .maybeSingle();

  if (!data?.totp_enabled_at || !data.totp_secret) {
    return NextResponse.json({ error: "Two-factor is not set up on this account." }, { status: 400 });
  }

  const supplied = parsed.data.code.trim();
  const { valid, step } = verifyCode(data.totp_secret, supplied);
  const fresh = valid && step !== null && step !== data.totp_last_step;

  const hash = createHash("sha256").update(supplied.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
  const recoveryHashes = data.totp_recovery_hashes ?? [];
  const viaRecovery = recoveryHashes.includes(hash);

  if (!fresh && !viaRecovery) {
    return NextResponse.json(
      { error: valid ? "That code has already been used. Wait for the next one." : "That code is not right." },
      { status: 400 }
    );
  }

  await supabase
    .from("user_accounts")
    .update(
      viaRecovery
        ? { totp_recovery_hashes: recoveryHashes.filter((entry) => entry !== hash) }
        : { totp_last_step: step }
    )
    .eq("id", account.id);

  if (viaRecovery) {
    await logAudit({
      action: "user.2fa_recovery_code_used",
      resourceType: "user_account",
      resourceId: account.id,
      userId: account.id,
      newValue: { remaining: recoveryHashes.length - 1 },
      request,
    });
  }

  const response = NextResponse.json({
    ok: true,
    usedRecoveryCode: viaRecovery,
    recoveryCodesLeft: viaRecovery ? recoveryHashes.length - 1 : recoveryHashes.length,
  });

  response.cookies.set(SECOND_FACTOR_COOKIE, mintToken(account.id), {
    maxAge: SECOND_FACTOR_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
