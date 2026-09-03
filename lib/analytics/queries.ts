import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

export type Point = { x: string; y: number };
export type Series = { label: string; points: Point[] };
export type Breakdown = { label: string; value: number; share: number };

export type WebinarAnalytics = {
  range: { from: string; to: string };
  tiles: {
    registrations: number;
    attendees: number;
    noShowRate: number;
    avgWatchPercentage: number;
    avgWatchSeconds: number;
    offerCtr: number;
    conversionRate: number;
    revenueCents: number;
    currency: string;
    /** Same metrics over the immediately preceding window, for deltas. */
    previous: {
      registrations: number;
      attendees: number;
      conversionRate: number;
      revenueCents: number;
    };
  };
  timeline: { day: string; registrations: number; attendees: number }[];
  retention: { percent: number; viewers: number; share: number }[];
  biggestDrop: { fromPercent: number; toPercent: number; lost: number } | null;
  funnel: { label: string; value: number; ofPrevious: number | null }[];
  sources: Breakdown[];
  devices: Breakdown[];
  countries: { ip: Breakdown[]; declared: Breakdown[] };
  sessions: {
    id: string;
    startsAt: string;
    registrations: number;
    attendees: number;
    attendanceRate: number;
    avgWatchPercentage: number;
    conversionRate: number;
  }[];
  timeSlots: { weekday: number; hour: number; sessions: number; attendanceRate: number }[];
  capture: { deviceFrom: string | null; countedRegistrants: number };
};

/** Bucket a set of values into share-of-total rows, biggest first. */
function toBreakdown(
  rows: (string | null)[],
  unknownLabel: string
): Breakdown[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row?.trim() || unknownLabel;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...counts.entries()]
    .map(([label, value]) => ({
      label,
      value,
      share: Math.round((value / total) * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value);
}

const day = (iso: string) => iso.slice(0, 10);

export async function getWebinarAnalytics(
  supabase: Client,
  webinarId: string,
  from: Date,
  to: Date
): Promise<WebinarAnalytics> {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  // The window immediately before this one, same length, for period deltas.
  const span = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - span).toISOString();

  const [
    { data: registrants },
    { data: previous },
    { data: sessions },
    { data: purchases },
    { data: sources },
    { data: joinEvents },
    { data: offer },
  ] = await Promise.all([
    supabase
      .from("registrants")
      .select(
        "id, created_at, attended, watch_percentage, watch_seconds, clicked_offer, bought, device_type, ip_country, country_code, session_id"
      )
      .eq("webinar_id", webinarId)
      .eq("is_test", false)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("registrants")
      .select("id, attended, bought")
      .eq("webinar_id", webinarId)
      .eq("is_test", false)
      .gte("created_at", prevFrom)
      .lt("created_at", fromIso),
    // Test runs are excluded everywhere a host reads their own numbers. A
    // preview that moved the conversion rate would make the feature unusable
    // for the one thing it exists for.
    supabase
      .from("webinar_sessions")
      .select("id, starts_at, status")
      .eq("webinar_id", webinarId)
      .eq("is_test", false)
      .order("starts_at", { ascending: false })
      .limit(60),
    supabase
      .from("purchases")
      .select("amount_cents, currency, created_at")
      .eq("webinar_id", webinarId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("attendee_sources")
      .select("registrant_id, utm_source, referrer_url")
      .limit(5000),
    supabase
      .from("attendee_events")
      .select("registrant_id, created_at")
      .eq("event_type", "joined_session")
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("webinar_offers")
      .select("currency")
      .eq("webinar_id", webinarId)
      .limit(1)
      .maybeSingle(),
  ]);

  const all = registrants ?? [];
  const ids = new Set(all.map((r) => r.id));
  const attended = all.filter((r) => r.attended);
  const bought = all.filter((r) => r.bought);
  const clicked = all.filter((r) => r.clicked_offer);

  // ── Tiles ──────────────────────────────────────────────────────────────────
  const prevAll = previous ?? [];
  const prevAttended = prevAll.filter((r) => r.attended);

  const avgWatchPct = attended.length
    ? attended.reduce((sum, r) => sum + Number(r.watch_percentage ?? 0), 0) /
      attended.length
    : 0;
  const avgWatchSecs = attended.length
    ? attended.reduce((sum, r) => sum + (r.watch_seconds ?? 0), 0) /
      attended.length
    : 0;

  const revenueCents = (purchases ?? []).reduce(
    (sum, p) => sum + (p.amount_cents ?? 0),
    0
  );

  // ── Retention curve ────────────────────────────────────────────────────────
  // Share of attendees who reached at least x% of the video. Monotonically
  // decreasing by construction — if it ever rises, this is wrong.
  const retention: WebinarAnalytics["retention"] = [];
  for (let percent = 0; percent <= 100; percent += 5) {
    const viewers = attended.filter(
      (r) => Number(r.watch_percentage ?? 0) >= percent
    ).length;
    retention.push({
      percent,
      viewers,
      share: attended.length
        ? Math.round((viewers / attended.length) * 1000) / 10
        : 0,
    });
  }

  let biggestDrop: WebinarAnalytics["biggestDrop"] = null;
  for (let i = 1; i < retention.length; i += 1) {
    const lost = retention[i - 1].viewers - retention[i].viewers;
    if (lost > (biggestDrop?.lost ?? 0)) {
      biggestDrop = {
        fromPercent: retention[i - 1].percent,
        toPercent: retention[i].percent,
        lost,
      };
    }
  }

  // ── Funnel ─────────────────────────────────────────────────────────────────
  const halfway = attended.filter(
    (r) => Number(r.watch_percentage ?? 0) >= 50
  ).length;

  const stages = [
    { label: "Registered", value: all.length },
    { label: "Attended", value: attended.length },
    { label: "Watched 50%+", value: halfway },
    { label: "Clicked offer", value: clicked.length },
    { label: "Bought", value: bought.length },
  ];

  const funnel = stages.map((stage, index) => ({
    ...stage,
    ofPrevious:
      index === 0 || !stages[index - 1].value
        ? null
        : Math.round((stage.value / stages[index - 1].value) * 1000) / 10,
  }));

  // ── Timeline ───────────────────────────────────────────────────────────────
  const byDay = new Map<string, { registrations: number; attendees: number }>();
  for (const r of all) {
    const key = day(r.created_at);
    const entry = byDay.get(key) ?? { registrations: 0, attendees: 0 };
    entry.registrations += 1;
    byDay.set(key, entry);
  }
  for (const event of joinEvents ?? []) {
    if (!ids.has(event.registrant_id)) continue;
    const key = day(event.created_at);
    const entry = byDay.get(key) ?? { registrations: 0, attendees: 0 };
    entry.attendees += 1;
    byDay.set(key, entry);
  }

  const timeline = [...byDay.entries()]
    .map(([d, v]) => ({ day: d, ...v }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // ── Breakdowns ─────────────────────────────────────────────────────────────
  const sourceByRegistrant = new Map(
    (sources ?? [])
      .filter((s) => ids.has(s.registrant_id))
      .map((s) => [
        s.registrant_id,
        s.utm_source ||
          (s.referrer_url ? hostOf(s.referrer_url) : null),
      ])
  );

  const sourceRows = all.map((r) => sourceByRegistrant.get(r.id) ?? null);

  // Device is only known for registrants captured after Phase 6 shipped.
  const withDevice = all.filter((r) => r.device_type);

  // ── Per-session comparison ─────────────────────────────────────────────────
  const bySession = new Map<
    string,
    { registrations: number; attendees: number; watch: number; bought: number }
  >();
  for (const r of all) {
    if (!r.session_id) continue;
    const entry = bySession.get(r.session_id) ?? {
      registrations: 0,
      attendees: 0,
      watch: 0,
      bought: 0,
    };
    entry.registrations += 1;
    if (r.attended) {
      entry.attendees += 1;
      entry.watch += Number(r.watch_percentage ?? 0);
    }
    if (r.bought) entry.bought += 1;
    bySession.set(r.session_id, entry);
  }

  const sessionRows = (sessions ?? [])
    .filter((s) => bySession.has(s.id))
    .map((s) => {
      const e = bySession.get(s.id)!;
      return {
        id: s.id,
        startsAt: s.starts_at,
        registrations: e.registrations,
        attendees: e.attendees,
        attendanceRate: e.registrations
          ? Math.round((e.attendees / e.registrations) * 1000) / 10
          : 0,
        avgWatchPercentage: e.attendees
          ? Math.round((e.watch / e.attendees) * 10) / 10
          : 0,
        conversionRate: e.attendees
          ? Math.round((e.bought / e.attendees) * 1000) / 10
          : 0,
      };
    });

  // ── Time slots ─────────────────────────────────────────────────────────────
  const slots = new Map<string, { sessions: number; rate: number }>();
  for (const row of sessionRows) {
    const date = new Date(row.startsAt);
    const key = `${date.getUTCDay()}-${date.getUTCHours()}`;
    const entry = slots.get(key) ?? { sessions: 0, rate: 0 };
    entry.sessions += 1;
    entry.rate += row.attendanceRate;
    slots.set(key, entry);
  }

  const timeSlots = [...slots.entries()].map(([key, value]) => {
    const [weekday, hour] = key.split("-").map(Number);
    return {
      weekday,
      hour,
      sessions: value.sessions,
      attendanceRate: Math.round((value.rate / value.sessions) * 10) / 10,
    };
  });

  // Earliest registrant carrying device data — the honest start of that chart.
  const deviceFrom = withDevice.length
    ? withDevice.reduce(
        (earliest, r) => (r.created_at < earliest ? r.created_at : earliest),
        withDevice[0].created_at
      )
    : null;

  return {
    range: { from: fromIso, to: toIso },
    tiles: {
      registrations: all.length,
      attendees: attended.length,
      noShowRate: all.length
        ? Math.round(((all.length - attended.length) / all.length) * 1000) / 10
        : 0,
      avgWatchPercentage: Math.round(avgWatchPct * 10) / 10,
      avgWatchSeconds: Math.round(avgWatchSecs),
      offerCtr: attended.length
        ? Math.round((clicked.length / attended.length) * 1000) / 10
        : 0,
      conversionRate: attended.length
        ? Math.round((bought.length / attended.length) * 1000) / 10
        : 0,
      revenueCents,
      currency: purchases?.[0]?.currency ?? offer?.currency ?? "USD",
      previous: {
        registrations: prevAll.length,
        attendees: prevAttended.length,
        conversionRate: prevAttended.length
          ? Math.round(
              (prevAll.filter((r) => r.bought).length / prevAttended.length) *
                1000
            ) / 10
          : 0,
        revenueCents: 0,
      },
    },
    timeline,
    retention,
    biggestDrop,
    funnel,
    sources: toBreakdown(sourceRows, "No source recorded"),
    devices: toBreakdown(
      withDevice.map((r) => r.device_type),
      "Unknown"
    ),
    countries: {
      ip: toBreakdown(
        all.filter((r) => r.ip_country).map((r) => r.ip_country),
        "Unknown"
      ),
      declared: toBreakdown(
        all.map((r) => r.country_code),
        "Unknown"
      ),
    },
    sessions: sessionRows,
    timeSlots,
    capture: { deviceFrom, countedRegistrants: withDevice.length },
  };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
