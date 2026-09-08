import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Predictive nurture: works out WHEN and on WHICH channel to reach a
 * specific lead, from what that lead has actually done.
 *
 * The distinction from follow-up agents (lib/agents/dispatch.ts) is
 * deliberate: agents write the words, this decides the timing. An agent runs
 * on a fixed cooldown; a nurture sequence lands at the hour that particular
 * person has historically engaged at.
 *
 * Two honest limits, both reflected in what the UI calls these fields:
 *
 * - Times are computed and scheduled in UTC, from the lead's own event
 *   timestamps. This app does not store a per-registrant timezone (country_code
 *   is a dialling code, not a zone), so rather than infer one and be wrong,
 *   the hour someone actually engaged at is used directly — which is the thing
 *   that matters anyway.
 * - "Preferred channel" means reachable and previously delivered to, not
 *   measured responsiveness: there is no open or click tracking on outbound
 *   messages in this codebase to measure that from.
 */

export type Touchpoint = {
  /** Days after the sequence is activated. */
  dayOffset: number;
  /** UTC hour, from this lead's own engagement pattern. */
  hour: number;
  channel: "email" | "sms" | "whatsapp";
  intent: string;
  subject: string;
  body: string;
  sentAt?: string | null;
};

export type Prediction = {
  optimalHours: number[];
  preferredChannel: "email" | "sms" | "whatsapp";
  predictedConversionDate: string | null;
  tier: "hot" | "warm" | "cold";
  touchpoints: Touchpoint[];
};

/** The most common hours in a set of timestamps, best first. */
function modalHours(timestamps: string[]): number[] {
  const counts = new Map<number, number>();
  for (const timestamp of timestamps) {
    const hour = new Date(timestamp).getUTCHours();
    if (Number.isNaN(hour)) continue;
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3).map(([hour]) => hour);
}

function tierFor(watchPercentage: number, clickedOffer: boolean): Prediction["tier"] {
  if (clickedOffer || watchPercentage >= 75) return "hot";
  if (watchPercentage >= 30) return "warm";
  return "cold";
}

/** How the sequence is shaped per tier: a hot lead gets fewer, faster touches; a cold one gets spaced-out value first. */
const PLANS: Record<Prediction["tier"], { dayOffset: number; intent: string }[]> = {
  hot: [
    { dayOffset: 0, intent: "Answer the objection that stopped them" },
    { dayOffset: 1, intent: "Proof — a result someone like them got" },
    { dayOffset: 3, intent: "Last call before the offer closes" },
  ],
  warm: [
    { dayOffset: 1, intent: "Recap the single most useful thing they saw" },
    { dayOffset: 3, intent: "Answer the objection that stopped them" },
    { dayOffset: 6, intent: "Proof — a result someone like them got" },
    { dayOffset: 10, intent: "Last call before the offer closes" },
  ],
  cold: [
    { dayOffset: 2, intent: "Replay link — they barely watched" },
    { dayOffset: 5, intent: "Recap the single most useful thing they saw" },
    { dayOffset: 12, intent: "One clear invitation to the offer" },
  ],
};

export async function predictForRegistrant(input: {
  registrantId: string;
  webinarId: string;
  webinarTitle: string;
  replayLink: string;
}): Promise<Prediction | null> {
  const supabase = createServiceClient();

  const { data: registrant } = await supabase
    .from("registrants")
    .select("id, full_name, email, phone, watch_percentage, clicked_offer, bought, created_at, joined_at, offer_clicked_at")
    .eq("id", input.registrantId)
    .maybeSingle();

  if (!registrant || registrant.bought) return null;

  const { data: events } = await supabase
    .from("attendee_events")
    .select("created_at")
    .eq("registrant_id", registrant.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Their own engagement timestamps, richest source first.
  const timestamps = [
    ...(events ?? []).map((event) => event.created_at),
    registrant.joined_at,
    registrant.offer_clicked_at,
    registrant.created_at,
  ].filter(Boolean) as string[];

  const optimalHours = modalHours(timestamps);
  const hour = optimalHours[0] ?? 15;

  const { data: delivered } = await supabase
    .from("message_logs")
    .select("channel, status")
    .eq("registrant_id", registrant.id)
    .eq("status", "sent")
    .limit(20);

  const deliveredChannels = new Set((delivered ?? []).map((row) => row.channel));
  const preferredChannel: Prediction["preferredChannel"] =
    registrant.phone && deliveredChannels.has("sms") ? "sms" : registrant.phone && deliveredChannels.has("whatsapp") ? "whatsapp" : "email";

  const tier = tierFor(registrant.watch_percentage, registrant.clicked_offer);
  const plan = PLANS[tier];

  const firstName = (registrant.full_name || "there").split(" ")[0];
  const touchpoints: Touchpoint[] = plan.map((step) => ({
    dayOffset: step.dayOffset,
    hour,
    channel: preferredChannel,
    intent: step.intent,
    subject: `${step.intent} — ${input.webinarTitle}`,
    body: `Hi ${firstName},\n\n${step.intent}.\n\nYou can rewatch "${input.webinarTitle}" any time here: ${input.replayLink}`,
  }));

  // A date, not a certainty: the last touchpoint is when this sequence stops
  // trying, which is the only defensible thing to call a predicted close.
  const lastOffset = plan[plan.length - 1]?.dayOffset ?? 7;
  const predictedConversionDate = new Date(Date.now() + lastOffset * 86_400_000).toISOString().slice(0, 10);

  return { optimalHours, preferredChannel, predictedConversionDate, tier, touchpoints };
}
