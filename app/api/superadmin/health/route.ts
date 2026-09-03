import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { billingConfigured, webhooksConfigured } from "@/lib/billing/stripe";
import { configuredChannels } from "@/lib/messaging/providers";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type CronRow = {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  failures_24h: number;
  runs_24h: number;
};

/** Expected runs per day, from the cron expression, to spot a stalled job. */
function expectedRuns(schedule: string) {
  if (schedule === "* * * * *") return 1440;
  const everyN = schedule.match(/^\*\/(\d+) \* \* \* \*$/);
  if (everyN) return Math.floor(1440 / Number(everyN[1]));
  if (/^\d+ \* \* \* \*$/.test(schedule)) return 24;
  return null;
}

/**
 * Platform health.
 *
 * Answers "is it working?" — a question nothing in the product could answer
 * until now. Each section is independent so one slow query cannot blank the
 * whole page.
 */
export async function GET() {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createServiceClient();
  const now = Date.now();

  const [crons, queue, overdue, webhooks, bounced, errors] = await Promise.all([
    supabase.rpc("admin_cron_health"),

    supabase
      .from("scheduled_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    // Pending and already past due: the earliest sign dispatch has stalled.
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
      .gte("created_at", new Date(now - 7 * 86_400_000).toISOString()),

    supabase
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(now - 86_400_000).toISOString()),
  ]);

  const cronRows = ((crons.data ?? []) as CronRow[]).map((row) => {
    const expected = expectedRuns(row.schedule);
    // Under 80% of expected runs means it is missing ticks, even if the ones
    // that did run succeeded.
    const stalled =
      expected !== null && row.runs_24h > 0 && row.runs_24h < expected * 0.8;

    return {
      ...row,
      expected_runs_24h: expected,
      verdict: !row.active
        ? ("paused" as const)
        : row.failures_24h > 0
          ? ("failing" as const)
          : row.runs_24h === 0
            ? ("silent" as const)
            : stalled
              ? ("behind" as const)
              : ("healthy" as const),
    };
  });

  const webhookRows = webhooks.data ?? [];
  const delivered = webhookRows.filter((r) => r.status === "delivered").length;
  const permanent = webhookRows.filter(
    (r) => r.status === "failed_permanently"
  ).length;

  const messageRows = bounced.data ?? [];
  const sent = messageRows.filter((r) => r.status === "sent").length;
  const failed = messageRows.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    crons: cronRows,
    queue: {
      pending: queue.count ?? 0,
      overdue: overdue.count ?? 0,
    },
    webhooks: {
      total24h: webhookRows.length,
      delivered,
      permanentlyFailed: permanent,
      failureRate: webhookRows.length
        ? +(((webhookRows.length - delivered) / webhookRows.length) * 100).toFixed(1)
        : 0,
    },
    messages: {
      total7d: messageRows.length,
      sent,
      failed,
      failureRate: messageRows.length
        ? +((failed / messageRows.length) * 100).toFixed(1)
        : 0,
    },
    errors24h: errors.count ?? 0,
    providers: {
      // A placeholder key is a configuration failure that should be visible
      // here rather than discovered by a customer.
      email: configuredChannels().email,
      sms: configuredChannels().sms,
      whatsapp: configuredChannels().whatsapp,
      stripe: billingConfigured(),
      stripeWebhooks: webhooksConfigured(),
      anthropic: isRealKey(process.env.ANTHROPIC_API_KEY),
      cloudinary: Boolean(process.env.CLOUDINARY_API_SECRET?.trim()),
    },
  });
}

/**
 * Whether a key looks real rather than a placeholder.
 *
 * `your-anthropic-api-key` sat in production for weeks looking configured.
 * A length and prefix check catches that class of mistake.
 */
function isRealKey(value: string | undefined) {
  const key = value?.trim() ?? "";
  return key.length > 40 && !key.startsWith("your-");
}
