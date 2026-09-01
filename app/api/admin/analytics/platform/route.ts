import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { resolveRange } from "@/app/api/admin/analytics/webinar/route";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIN_ATTENDEES_FOR_RANKING = 5;

export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { from, to } = resolveRange(new URL(request.url).searchParams);
  const supabase = createServiceClient();

  const [
    { count: webinarsTotal },
    { count: webinarsPublished },
    { data: registrants },
    { data: purchases },
    { data: messages },
    { data: webinars },
    { data: daily },
  ] = await Promise.all([
    supabase.from("webinars").select("id", { count: "exact", head: true }),
    supabase
      .from("webinars")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("registrants")
      .select("id, webinar_id, attended, bought, created_at")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString()),
    supabase
      .from("purchases")
      .select("amount_cents, currency, created_at")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString()),
    supabase
      .from("scheduled_messages")
      .select("channel")
      .eq("status", "sent")
      .gte("sent_at", from.toISOString())
      .lte("sent_at", to.toISOString()),
    supabase.from("webinars").select("id, title, status"),
    supabase
      .from("platform_daily_stats")
      .select("day, registrations, attendees, revenue_cents")
      .gte("day", from.toISOString().slice(0, 10))
      .order("day", { ascending: true }),
  ]);

  const all = registrants ?? [];
  const attended = all.filter((r) => r.attended);

  // Top performers, with a floor so a webinar that converted one of one
  // attendee cannot top the table.
  const byWebinar = new Map<
    string,
    { registrations: number; attendees: number; bought: number }
  >();
  for (const r of all) {
    const entry = byWebinar.get(r.webinar_id) ?? {
      registrations: 0,
      attendees: 0,
      bought: 0,
    };
    entry.registrations += 1;
    if (r.attended) entry.attendees += 1;
    if (r.bought) entry.bought += 1;
    byWebinar.set(r.webinar_id, entry);
  }

  const titles = new Map((webinars ?? []).map((w) => [w.id, w.title]));

  const topWebinars = [...byWebinar.entries()]
    .filter(([, v]) => v.attendees >= MIN_ATTENDEES_FOR_RANKING)
    .map(([id, v]) => ({
      id,
      title: titles.get(id) ?? "Untitled",
      registrations: v.registrations,
      attendees: v.attendees,
      conversionRate: Math.round((v.bought / v.attendees) * 1000) / 10,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10);

  const channelCounts = { email: 0, sms: 0, whatsapp: 0 };
  for (const m of messages ?? []) {
    if (m.channel in channelCounts) {
      channelCounts[m.channel as keyof typeof channelCounts] += 1;
    }
  }

  return NextResponse.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: {
      webinars: webinarsTotal ?? 0,
      published: webinarsPublished ?? 0,
      registrations: all.length,
      attendees: attended.length,
      purchases: purchases?.length ?? 0,
      revenueCents: (purchases ?? []).reduce(
        (sum, p) => sum + (p.amount_cents ?? 0),
        0
      ),
      currency: purchases?.[0]?.currency ?? "USD",
      messages: channelCounts,
    },
    timeline: (daily ?? []).map((d) => ({
      day: d.day,
      registrations: d.registrations,
      attendees: d.attendees,
    })),
    topWebinars,
    /**
     * Subscription metrics describe host billing, which does not exist until
     * Phase 7. Returned explicitly as pending rather than as zero — a zero and
     * an unknown are different facts and the dashboard must not conflate them.
     */
    subscriptions: {
      pending: "phase-7" as const,
      mrrCents: null,
      arrCents: null,
      newSignups: null,
      churnRate: null,
      freeToPaidRate: null,
    },
  });
}
