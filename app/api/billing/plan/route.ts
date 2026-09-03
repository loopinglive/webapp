import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { planPermissions } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

/** The client's view of its own plan. Never trusted for enforcement. */
export async function GET() {
  const account = await getUserAccount();
  const permissions = planPermissions(account);

  return NextResponse.json({
    planSlug: permissions.planSlug,
    planName: permissions.plan.name,
    isPaid: permissions.isPaid,
    isFree: permissions.isFree,
    isExpired: permissions.isExpired,
    isPastDue: permissions.isPastDue,
    isSuspended: permissions.isSuspended,
    canGoLive: permissions.canGoLive,
    canPublish: permissions.canPublish,
    planExpiresAt: account?.plan_expires_at ?? null,
    referralCode: account?.referral_code ?? null,
    isAdmin: Boolean(account?.is_admin),
    fullName: account?.full_name ?? null,
    email: account?.email ?? null,
  });
}
