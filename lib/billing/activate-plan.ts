import "server-only";

import { PLAN_BY_SLUG, type PlanSlug } from "@/lib/billing/plans";
import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { sendEmail } from "@/lib/messaging/providers";
import { createServiceClient } from "@/lib/supabase/server";

export type ActivationSource = "paystack" | "flutterwave" | "mpesa" | "razorpay";

/**
 * Grants a plan from a non-Stripe payment.
 *
 * Mirrors what app/api/billing/webhook/route.ts does for Stripe's
 * checkout.session.completed (same user_accounts columns, same invoices
 * shape, same receipt email) without touching that file — it is the one
 * thing standing between attempted double-charges and a live billing system,
 * and the risk of a refactor regression there outweighs the benefit of
 * sharing this code with it. New local-payment providers call this instead;
 * Stripe's own webhook is left exactly as it was.
 */
export async function activatePlan(params: {
  userId: string;
  planSlug: PlanSlug;
  source: ActivationSource;
  amount: number;
  currency: string;
  providerReference: string;
}): Promise<void> {
  const supabase = createServiceClient();

  const now = new Date();
  const expires = new Date(now);
  if (params.planSlug === "monthly") expires.setMonth(expires.getMonth() + 1);
  else if (params.planSlug === "yearly") expires.setFullYear(expires.getFullYear() + 1);

  await supabase
    .from("user_accounts")
    .update({
      plan_slug: params.planSlug,
      subscription_status: "active",
      plan_started_at: now.toISOString(),
      plan_expires_at: params.planSlug === "lifetime" ? null : expires.toISOString(),
    })
    .eq("id", params.userId);

  await supabase.from("invoices").insert({
    user_id: params.userId,
    stripe_payment_intent_id: `${params.source}:${params.providerReference}`,
    amount: params.amount,
    currency: params.currency,
    status: "paid",
    plan_slug: params.planSlug,
    billing_period: PLAN_BY_SLUG.get(params.planSlug)?.billingPeriod ?? params.planSlug,
    paid_at: now.toISOString(),
  });

  const { data: account } = await supabase
    .from("user_accounts")
    .select("full_name, email")
    .eq("id", params.userId)
    .maybeSingle();

  if (account?.email) {
    try {
      const plan = PLAN_BY_SLUG.get(params.planSlug);
      const { subject, html, text } = renderPlatformEmail(
        "host_payment_receipt",
        {
          host_name: account.full_name || "there",
          amount: `${params.currency} ${params.amount}`,
          plan_name: plan?.name ?? params.planSlug,
          period_start: now.toLocaleDateString(),
          period_end: params.planSlug === "lifetime" ? "Never — lifetime access" : expires.toLocaleDateString(),
          next_payment_date: params.planSlug === "lifetime" ? "N/A" : expires.toLocaleDateString(),
          invoice_number: params.providerReference,
          invoice_url: "",
        },
        { brandName: "Loopinglive" }
      );

      await sendEmail({
        to: account.email,
        fromName: "Loopinglive",
        fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
        subject,
        html,
        text,
      });
    } catch {
      // A receipt email must never fail the activation it is confirming.
    }
  }
}
