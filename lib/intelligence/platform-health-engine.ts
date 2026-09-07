import "server-only";

import { classifyMetric, HEALTH_METRICS } from "@/lib/intelligence/platform-health";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type Client = ReturnType<typeof createServiceClient>;

type CronRow = { jobname: string; active: boolean; failures_24h: number };

/**
 * Snapshots the same signals the live `/superadmin/health` page computes on
 * demand into named, thresholded rows — one call, reused by both, so the
 * two views can never quietly disagree on what "a webhook failure" counts.
 */
export async function recordHealthSnapshot(supabase: Client) {
  const now = Date.now();

  const [crons, overdue, webhooks, messages, errors] = await Promise.all([
    supabase.rpc("admin_cron_health"),
    supabase
      .from("scheduled_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("scheduled_for", new Date().toISOString()),
    supabase
      .from("webhook_logs")
      .select("status")
      .gte("created_at", new Date(now - 86_400_000).toISOString()),
    supabase
      .from("scheduled_messages")
      .select("status")
      .gte("created_at", new Date(now - 86_400_000).toISOString()),
    supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(now - 86_400_000).toISOString()),
  ]);

  const cronRows = (crons.data ?? []) as CronRow[];
  const cronFailureCount = cronRows.filter((c) => c.active && c.failures_24h > 0).length;

  const webhookRows = webhooks.data ?? [];
  const delivered = webhookRows.filter((r) => r.status === "delivered").length;
  const webhookFailureRate = webhookRows.length ? Math.round(((webhookRows.length - delivered) / webhookRows.length) * 1000) / 10 : 0;

  const messageRows = messages.data ?? [];
  const failed = messageRows.filter((r) => r.status === "failed").length;
  const messageFailureRate = messageRows.length ? Math.round((failed / messageRows.length) * 1000) / 10 : 0;

  const values: Record<string, number> = {
    webhook_failure_rate: webhookFailureRate,
    message_failure_rate: messageFailureRate,
    error_count_24h: errors.count ?? 0,
    cron_failure_count: cronFailureCount,
    queue_overdue_count: overdue.count ?? 0,
  };

  const rows = HEALTH_METRICS.map((metric) => {
    const value = values[metric.name] ?? 0;
    return {
      metric_name: metric.name,
      metric_value: value,
      metric_unit: metric.unit,
      threshold_warning: metric.thresholdWarning,
      threshold_critical: metric.thresholdCritical,
      status: classifyMetric(value, metric.thresholdWarning, metric.thresholdCritical),
      metadata: {} as unknown as Json,
    };
  });

  const { data: inserted, error } = await supabase.from("platform_health_metrics").insert(rows).select("*");
  if (error) throw new Error(error.message);

  return inserted ?? [];
}
