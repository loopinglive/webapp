import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { PLAN_BY_SLUG, type PlanSlug } from "@/lib/billing/plans";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID: PlanSlug[] = ["free", "monthly", "yearly", "lifetime"];

/** Grants a plan without payment. Recorded as a zero-value invoice. */
export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { userId, planSlug } = (await request.json()) as {
    userId?: string;
    planSlug?: PlanSlug;
  };

  if (!userId || !planSlug || !VALID.includes(planSlug)) {
    return NextResponse.json({ error: "A user and a valid plan are required." }, { status: 400 });
  }

  const expires = new Date();
  if (planSlug === "monthly") expires.setMonth(expires.getMonth() + 1);
  else if (planSlug === "yearly") expires.setFullYear(expires.getFullYear() + 1);

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("user_accounts")
    .update({
      plan_slug: planSlug,
      subscription_status: "active",
      plan_started_at: new Date().toISOString(),
      // Lifetime and free never expire.
      plan_expires_at:
        planSlug === "lifetime" || planSlug === "free" ? null : expires.toISOString(),
    })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (planSlug !== "free") {
    await supabase.from("invoices").insert({
      user_id: userId,
      amount: 0,
      status: "complimentary",
      plan_slug: planSlug,
      billing_period: PLAN_BY_SLUG.get(planSlug)?.billingPeriod ?? planSlug,
      paid_at: new Date().toISOString(),
    });
  }

  // Reuses the impersonation log as the admin action trail.
  await supabase.from("impersonation_logs").insert({
    admin_id: admin.id,
    impersonated_user_id: userId,
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    reason: `Granted ${planSlug} plan`,
  });

  return NextResponse.json({ success: true });
}
