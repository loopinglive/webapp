import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** RFC 4180 quoting, plus the spreadsheet formula-injection guard. */
function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const row = (values: unknown[]) => values.map(cell).join(",");

const DATASETS = ["users", "invoices", "affiliates", "errors"] as const;
type Dataset = (typeof DATASETS)[number];

/**
 * CSV export for the admin tables.
 *
 * Same guard as the Phase 4 and 6 exports: a name beginning with `=` is a
 * formula the moment someone opens the file in Excel, and an attendee chooses
 * their own name.
 */
export async function GET(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const requested = new URL(request.url).searchParams.get("dataset") ?? "users";
  if (!DATASETS.includes(requested as Dataset)) {
    return Response.json({ error: "Unknown dataset." }, { status: 400 });
  }
  const dataset = requested as Dataset;

  const supabase = createServiceClient();
  const lines: string[] = [];

  if (dataset === "users") {
    const { data } = await supabase
      .from("user_accounts")
      .select("email, full_name, plan_slug, subscription_status, is_admin, is_suspended, referral_code, created_at, last_login_at")
      .order("created_at", { ascending: false });

    lines.push(
      row(["Email", "Name", "Plan", "Status", "Admin", "Suspended", "Referral code", "Joined", "Last login"])
    );
    for (const u of data ?? []) {
      lines.push(
        row([
          u.email,
          u.full_name,
          u.plan_slug,
          u.subscription_status,
          u.is_admin ? "yes" : "no",
          u.is_suspended ? "yes" : "no",
          u.referral_code,
          u.created_at,
          u.last_login_at,
        ])
      );
    }
  }

  if (dataset === "invoices") {
    const { data } = await supabase
      .from("invoices")
      .select("id, user_id, amount, currency, status, plan_slug, billing_period, paid_at, created_at")
      .order("created_at", { ascending: false });

    const ids = [...new Set((data ?? []).map((i) => i.user_id).filter(Boolean))] as string[];
    const { data: users } = ids.length
      ? await supabase.from("user_accounts").select("id, email").in("id", ids)
      : { data: [] };
    const emailById = new Map((users ?? []).map((u) => [u.id, u.email]));

    lines.push(row(["Invoice", "Customer", "Amount", "Currency", "Status", "Plan", "Period", "Paid at"]));
    for (const i of data ?? []) {
      lines.push(
        row([
          i.id,
          i.user_id ? (emailById.get(i.user_id) ?? i.user_id) : "",
          i.amount,
          i.currency,
          i.status,
          i.plan_slug,
          i.billing_period,
          i.paid_at,
        ])
      );
    }
  }

  if (dataset === "affiliates") {
    const { data } = await supabase
      .from("affiliates")
      .select("user_id, referral_code, commission_rate, total_referrals, total_earnings, pending_earnings, paid_earnings, is_active, payout_method");

    const ids = (data ?? []).map((a) => a.user_id);
    const { data: users } = ids.length
      ? await supabase.from("user_accounts").select("id, email, full_name").in("id", ids)
      : { data: [] };
    const byId = new Map((users ?? []).map((u) => [u.id, u]));

    lines.push(
      row(["Email", "Name", "Code", "Rate %", "Referrals", "Total earned", "Pending", "Paid", "Active", "Payout method"])
    );
    for (const a of data ?? []) {
      const owner = byId.get(a.user_id);
      lines.push(
        row([
          owner?.email,
          owner?.full_name,
          a.referral_code,
          a.commission_rate,
          a.total_referrals,
          a.total_earnings,
          a.pending_earnings,
          a.paid_earnings,
          a.is_active ? "yes" : "no",
          a.payout_method,
        ])
      );
    }
  }

  if (dataset === "errors") {
    const { data } = await supabase
      .from("error_logs")
      .select("created_at, error_type, error_message, page_url, user_id")
      .order("created_at", { ascending: false })
      .limit(5000);

    lines.push(row(["When", "Type", "Message", "Page", "User"]));
    for (const e of data ?? []) {
      lines.push(row([e.created_at, e.error_type, e.error_message, e.page_url, e.user_id]));
    }
  }

  const date = new Date().toISOString().slice(0, 10);

  // BOM so Excel does not mangle accented names.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="loopinglive-${dataset}-${date}.csv"`,
    },
  });
}
