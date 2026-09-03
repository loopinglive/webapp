import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Email operations across the whole platform.
 *
 * The per-user message log answers "what happened to this customer". This
 * answers the one above it: is sending working at all, and which template or
 * channel is quietly failing.
 */
export async function GET(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const days = Math.min(90, Math.max(1, Number(params.get("days") ?? 30)));
  const channel = params.get("channel");
  const status = params.get("status");

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const supabase = createServiceClient();

  // Volume and outcomes for the window, and a recent slice for the table.
  const [{ data: all }, { count: unsubsCount }] = await Promise.all([
    supabase
      .from("scheduled_messages")
      .select("channel, status, template_key, error_message, created_at")
      .gte("created_at", since)
      .limit(20_000),
    supabase.from("unsubscribes").select("*", { count: "exact", head: true }),
  ]);

  const rows = all ?? [];

  const byChannel = (name: string) => {
    const subset = rows.filter((r) => r.channel === name);
    const sent = subset.filter((r) => r.status === "sent").length;
    const failed = subset.filter((r) => r.status === "failed").length;
    const pending = subset.filter((r) => r.status === "pending").length;
    const cancelled = subset.filter((r) => r.status === "cancelled").length;
    const abandoned = subset.filter((r) => r.status === "failed_permanently").length;

    return {
      channel: name,
      total: subset.length,
      sent,
      failed,
      pending,
      cancelled,
      abandoned,
      failureRate:
        sent + failed + abandoned
          ? +(((failed + abandoned) / (sent + failed + abandoned)) * 100).toFixed(1)
          : 0,
    };
  };

  // Failures grouped by template, so a single broken one is obvious rather
  // than diluted across the total.
  const failureGroups = new Map<
    string,
    { template: string; channel: string; count: number; sample: string | null }
  >();

  for (const row of rows) {
    if (row.status !== "failed") continue;
    const key = `${row.template_key ?? "unknown"}::${row.channel}`;
    const existing = failureGroups.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    failureGroups.set(key, {
      template: row.template_key ?? "unknown",
      channel: row.channel,
      count: 1,
      sample: row.error_message,
    });
  }

  // Recent messages for the table, filtered independently of the stats above.
  let recent = supabase
    .from("scheduled_messages")
    .select(
      "id, webinar_id, channel, status, template_key, subject, recipient_email, recipient_phone, error_message, scheduled_for, sent_at, attempts"
    )
    .gte("created_at", since)
    .order("scheduled_for", { ascending: false })
    .limit(100);

  if (channel === "email" || channel === "sms" || channel === "whatsapp") {
    recent = recent.eq("channel", channel);
  }
  if (
    status === "pending" ||
    status === "sent" ||
    status === "failed" ||
    status === "failed_permanently" ||
    status === "cancelled"
  ) {
    recent = recent.eq("status", status);
  }

  const { data: messages } = await recent;

  // Resolve webinar titles so a row is identifiable without another click.
  const webinarIds = [...new Set((messages ?? []).map((m) => m.webinar_id))].filter(
    Boolean
  ) as string[];

  const { data: webinars } = webinarIds.length
    ? await supabase.from("webinars").select("id, title").in("id", webinarIds)
    : { data: [] };

  const titleById = new Map((webinars ?? []).map((w) => [w.id, w.title]));

  return NextResponse.json({
    days,
    channels: ["email", "sms", "whatsapp"].map(byChannel),
    totals: {
      queued: rows.filter((r) => r.status === "pending").length,
      sent: rows.filter((r) => r.status === "sent").length,
      failed: rows.filter((r) => r.status === "failed").length,
      unsubscribes: unsubsCount ?? 0,
    },
    failuresByTemplate: [...failureGroups.values()].sort((a, b) => b.count - a.count),
    messages: (messages ?? []).map((message) => ({
      ...message,
      webinarTitle: message.webinar_id ? (titleById.get(message.webinar_id) ?? null) : null,
    })),
  });
}
