import "server-only";

import { planPermissions, type PlanPermissions } from "@/lib/billing/plans";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type UserAccount = {
  id: string;
  full_name: string;
  email: string;
  plan_slug: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  is_admin: boolean;
  admin_role: string | null;
  /** Set once an admin has finished enrolling in 2FA. Null otherwise. */
  totp_enabled_at: string | null;
  is_suspended: boolean;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
};

/**
 * The signed-in user's account row, or null.
 *
 * Reads through the service client after establishing identity from the
 * session, because a suspended user must still be identifiable in order to be
 * turned away — RLS on user_accounts would let them read their own row either
 * way, but this keeps one code path for both cases.
 */
export async function getUserAccount(): Promise<UserAccount | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("user_accounts")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as UserAccount | null) ?? null;
}

export async function getPlanPermissions(): Promise<PlanPermissions> {
  return planPermissions(await getUserAccount());
}

/**
 * Guards an API route that performs a paid action.
 *
 * Returns a response to send when access is refused, so callers stay a single
 * early-return rather than nesting.
 */
export async function requirePaidPlan() {
  const account = await getUserAccount();

  if (!account) {
    return {
      account: null,
      permissions: null,
      response: Response.json({ error: "Not signed in" }, { status: 401 }),
    } as const;
  }

  const permissions = planPermissions(account);

  if (account.is_suspended) {
    return {
      account,
      permissions,
      response: Response.json(
        { error: "This account has been suspended." },
        { status: 403 }
      ),
    } as const;
  }

  if (!permissions.canGoLive) {
    return {
      account,
      permissions,
      response: Response.json(
        {
          error: "This requires a paid plan.",
          upgradeRequired: true,
          planSlug: permissions.planSlug,
        },
        { status: 402 }
      ),
    } as const;
  }

  return { account, permissions, response: null } as const;
}

/** Super admin gate for /superadmin and its API routes. */
export async function requireSuperAdmin() {
  const account = await getUserAccount();

  if (!account?.is_admin) {
    return {
      account: null,
      response: Response.json({ error: "Not authorised" }, { status: 403 }),
    } as const;
  }

  return { account, response: null } as const;
}
