import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Weekly SOC2 evidence snapshot.
 *
 * Every value here is computed from real, queryable state — no metric is
 * invented for the sake of having a number. Where a control needs something
 * this codebase does not track (failed-login counts, a completed
 * penetration test), it is simply not collected here rather than faked; an
 * auditor cross-checking this table against the actual schema is exactly the
 * failure mode fabricated evidence would create.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  const authorised = (secret && provided === secret) || Boolean(await getAdminUser());
  if (!authorised) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const supabase = createServiceClient();
  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);
  const collected: Array<{ control_id: string; control_name: string; evidence_type: string; evidence_data: Json }> = [];

  // ─── CC6: Security — access control ───────────────────────────────────
  const [{ count: activeUsers }, { count: suspendedUsers }, { count: auditLogEntries }, { data: twoFactorRows }] =
    await Promise.all([
      supabase.from("user_accounts").select("id", { count: "exact", head: true }).eq("is_suspended", false),
      supabase.from("user_accounts").select("id", { count: "exact", head: true }).eq("is_suspended", true),
      supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(now.getTime() - 7 * 86_400_000).toISOString()),
      supabase.rpc("admin_2fa_status"),
    ]);

  const admins = (twoFactorRows ?? []) as Array<{ enabled: boolean }>;
  const adminTwoFactorAdoption = admins.length
    ? Math.round((admins.filter((admin) => admin.enabled).length / admins.length) * 100)
    : null;

  collected.push({
    control_id: "CC6.1",
    control_name: "Logical access — accounts and administrative 2FA",
    evidence_type: "access_control_snapshot",
    evidence_data: {
      active_accounts: activeUsers ?? 0,
      suspended_accounts: suspendedUsers ?? 0,
      admin_2fa_adoption_percent: adminTwoFactorAdoption,
    },
  });

  collected.push({
    control_id: "CC6.2",
    control_name: "Audit logging coverage",
    evidence_type: "audit_log_volume",
    evidence_data: { entries_last_7_days: auditLogEntries ?? 0 },
  });

  // ─── A1: Availability — the same signals /superadmin/health computes ──
  const { data: healthMetrics } = await supabase
    .from("platform_health_metrics")
    .select("metric_name, metric_value, status, recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(20);

  collected.push({
    control_id: "A1.2",
    control_name: "System monitoring",
    evidence_type: "health_metrics_snapshot",
    evidence_data: { metrics: healthMetrics ?? [] },
  });

  // ─── C1: Confidentiality — GDPR request handling within the 30-day SLA ─
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const [{ count: gdprPending }, { count: gdprOverdue }, { count: gdprCompleted7d }] = await Promise.all([
    supabase.from("gdpr_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("gdpr_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", thirtyDaysAgo),
    supabase
      .from("gdpr_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("processed_at", new Date(now.getTime() - 7 * 86_400_000).toISOString()),
  ]);

  collected.push({
    control_id: "C1.1",
    control_name: "Data subject request handling",
    evidence_type: "gdpr_sla_snapshot",
    evidence_data: {
      pending: gdprPending ?? 0,
      overdue_past_30_days: gdprOverdue ?? 0,
      completed_last_7_days: gdprCompleted7d ?? 0,
    },
  });

  const { error } = await supabase.from("soc2_evidence").insert(
    collected.map((row) => ({
      ...row,
      review_period_start: periodStart,
      review_period_end: periodEnd,
    }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collected: collected.length });
}
