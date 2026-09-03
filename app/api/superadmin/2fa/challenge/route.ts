import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  SECOND_FACTOR_COOKIE,
  SECOND_FACTOR_TTL_SECONDS,
  mintToken,
} from "@/lib/auth/second-factor";
import { verifyCode } from "@/lib/auth/totp";
import { requireSuperAdmin } from "@/lib/billing/account";
import { rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().min(6).max(20) });

/**
 * The code the console asks for once a day.
 *
 * Separate from the enrolment route because this one runs for an admin who is
 * signed in but not yet trusted, and it must accept a recovery code — the
 * whole point of those is that they work when the phone does not.
 */
export async function POST(request: Request) {
  const { account, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  // Ten a minute. A fumbled code costs nothing; walking a million does not fit.
  const limit = rateLimit(`2fa-challenge:${account.id}`, {
    limit: 10,
    windowSeconds: 60,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the code." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data } = await supabase
    .from("user_accounts")
    .select("totp_secret, totp_enabled_at, totp_recovery_hashes, totp_last_step")
    .eq("id", account.id)
    .maybeSingle();

  if (!data?.totp_enabled_at || !data.totp_secret) {
    return NextResponse.json(
      { error: "Two-factor is not set up on this account." },
      { status: 400 }
    );
  }

  const supplied = parsed.data.code.trim();
  const { valid, step } = verifyCode(data.totp_secret, supplied);

  /*
   * A code is good for a 90-second window, so without this check one read off
   * a screen stays usable for the rest of it. Refusing the step we last
   * accepted makes each code single-use.
   */
  const fresh = valid && step !== null && step !== data.totp_last_step;

  const hash = createHash("sha256")
    .update(supplied.replace(/[\s-]/g, "").toUpperCase())
    .digest("hex");
  const recoveryHashes = data.totp_recovery_hashes ?? [];
  const viaRecovery = recoveryHashes.includes(hash);

  if (!fresh && !viaRecovery) {
    return NextResponse.json(
      {
        error: valid
          ? "That code has already been used. Wait for the next one."
          : "That code is not right.",
      },
      { status: 400 }
    );
  }

  await supabase
    .from("user_accounts")
    .update(
      viaRecovery
        ? {
            // A recovery code is spent by using it. Leaving it valid would
            // make the printed list a permanent bypass rather than an
            // emergency one.
            totp_recovery_hashes: recoveryHashes.filter((entry) => entry !== hash),
          }
        : { totp_last_step: step }
    )
    .eq("id", account.id);

  if (viaRecovery) {
    await supabase.from("admin_actions").insert({
      admin_id: account.id,
      action: "2fa_recovery_code_used",
      detail: { remaining: recoveryHashes.length - 1 } as never,
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
