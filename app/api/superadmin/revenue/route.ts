import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { PLAN_BY_SLUG } from "@/lib/billing/plans";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Platform revenue.
 *
 * MRR counts recurring plans only — a lifetime purchase is one-off revenue and
 * folding it into a monthly figure would overstate it every month thereafter.
 */
export async function GET() {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createServiceClient();

  const [{ data: accounts }, { data: invoices }] = await Promise.all([
    supabase
      .from("user_accounts")
      .select("plan_slug, subscription_status, is_suspended, created_at"),
    supabase.from("invoices").select("amount, status, plan_slug, created_at, paid_at"),
  ]);

  const rows = accounts ?? [];
  const paidInvoices = (invoices ?? []).filter(
    (invoice) => invoice.status === "paid"
  );

  const active = rows.filter(
    (row) => !row.is_suspended && row.subscription_status !== "cancelled"
  );

  const counts = {
    total: rows.length,
    free: rows.filter((r) => r.plan_slug === "free").length,
    monthly: active.filter((r) => r.plan_slug === "monthly").length,
    yearly: active.filter((r) => r.plan_slug === "yearly").length,
    lifetime: active.filter((r) => r.plan_slug === "lifetime").length,
  };

  const monthlyPrice = PLAN_BY_SLUG.get("monthly")!.amountCents! / 100;
  const yearlyPrice = PLAN_BY_SLUG.get("yearly")!.amountCents! / 100;

  const mrr = counts.monthly * monthlyPrice + (counts.yearly * yearlyPrice) / 12;
  const arr = mrr * 12;
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

  const paidUsers = counts.monthly + counts.yearly + counts.lifetime;

  // Twelve months of new revenue and signups.
  const months: { month: string; revenue: number; signups: number; mrr: number }[] = [];
  const now = new Date();
  for (let offset = 11; offset >= 0; offset--) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);

    const revenue = paidInvoices
      .filter((i) => {
        const at = new Date(i.paid_at ?? i.created_at);
        return at >= start && at < end;
      })
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const signups = rows.filter((r) => {
      const at = new Date(r.created_at);
      return at >= start && at < end;
    }).length;

    months.push({
      month: start.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      revenue: Math.round(revenue),
      signups,
      // Only the current month's MRR is knowable without subscription history,
      // so earlier months report their new revenue rather than a fabricated MRR.
      mrr: offset === 0 ? Math.round(mrr) : 0,
    });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
  const cancelled = rows.filter(
    (r) => r.subscription_status === "cancelled"
  ).length;

  return NextResponse.json({
    counts,
    paidUsers,
    mrr: Math.round(mrr),
    arr: Math.round(arr),
    totalRevenue: Math.round(totalRevenue),
    arpu: paidUsers ? Math.round(totalRevenue / paidUsers) : 0,
    churnRate: paidUsers + cancelled ? +((cancelled / (paidUsers + cancelled)) * 100).toFixed(1) : 0,
    freeToPaid: rows.length ? +((paidUsers / rows.length) * 100).toFixed(1) : 0,
    newSignups: {
      today: rows.filter((r) => new Date(r.created_at).toDateString() === now.toDateString()).length,
      month: rows.filter((r) => new Date(r.created_at) >= thirtyDaysAgo).length,
    },
    months,
  });
}
