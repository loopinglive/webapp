import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

export type SessionAnalytics = {
  session: { id: string; startsAt: string; endsAt: string | null; status: string };
  webinar: { id: string; title: string; durationSeconds: number };
  /** Everything below shares one x-axis: seconds into the video. */
  viewers: { offset: number; viewers: number; realViewers: number }[];
  chat: { offset: number; real: number; scripted: number }[];
  dropOffs: { offset: number; lost: number }[];
  offerClicks: { offset: number; clicks: number }[];
  offerRevealOffset: number | null;
  peaks: { offset: number; messages: number }[];
  totals: {
    registered: number;
    attended: number;
    peakViewers: number;
    messages: number;
    realMessages: number;
    clicks: number;
    bought: number;
  };
  fromSnapshots: boolean;
};

const BUCKET_SECONDS = 60;

/** Seconds into the video for a wall-clock timestamp. */
const offsetOf = (at: string, startsAt: number) =>
  Math.max(0, Math.floor((new Date(at).getTime() - startsAt) / 1000));

export async function getSessionAnalytics(
  supabase: Client,
  sessionId: string
): Promise<SessionAnalytics | null> {
  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("id, webinar_id, starts_at, ends_at, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return null;

  const startsAt = new Date(session.starts_at).getTime();

  const [
    { data: webinar },
    { data: snapshots },
    { data: messages },
    { data: events },
    { data: registrants },
    { data: offer },
  ] = await Promise.all([
    supabase
      .from("webinars")
      .select("id, title, video_duration_seconds")
      .eq("id", session.webinar_id)
      .maybeSingle(),
    supabase
      .from("session_snapshots")
      .select("video_offset_seconds, viewers, real_viewers, chat_messages")
      .eq("session_id", sessionId)
      .order("video_offset_seconds", { ascending: true }),
    supabase
      .from("live_chat_messages")
      .select("sent_at, is_real_user")
      .eq("session_id", sessionId)
      .order("sent_at", { ascending: true }),
    supabase
      .from("attendee_events")
      .select("event_type, created_at")
      .eq("session_id", sessionId)
      .in("event_type", ["joined_session", "left_session", "clicked_offer"]),
    supabase
      .from("registrants")
      .select("id, attended, bought, clicked_offer")
      .eq("session_id", sessionId)
      .eq("is_test", false),
    supabase
      .from("webinar_offers")
      .select("trigger_video_offset_seconds")
      .eq("webinar_id", session.webinar_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
  ]);

  const duration = webinar?.video_duration_seconds ?? 0;

  // ── Viewer curve ───────────────────────────────────────────────────────────
  // Snapshots are authoritative where they exist. Otherwise reconstruct
  // concurrency from the join and leave events, which have been logged with
  // timestamps since Phase 4 — so sessions that ran before snapshots existed
  // still produce a curve.
  const fromSnapshots = (snapshots?.length ?? 0) > 3;
  let viewers: SessionAnalytics["viewers"];

  if (fromSnapshots) {
    viewers = (snapshots ?? []).map((s) => ({
      offset: s.video_offset_seconds,
      viewers: s.viewers ?? 0,
      realViewers: s.real_viewers ?? 0,
    }));
  } else {
    const deltas = new Map<number, number>();
    for (const event of events ?? []) {
      if (event.event_type === "clicked_offer") continue;
      const bucket =
        Math.floor(offsetOf(event.created_at, startsAt) / BUCKET_SECONDS) *
        BUCKET_SECONDS;
      const step = event.event_type === "joined_session" ? 1 : -1;
      deltas.set(bucket, (deltas.get(bucket) ?? 0) + step);
    }

    let running = 0;
    viewers = [...deltas.keys()]
      .sort((a, b) => a - b)
      .map((offset) => {
        running = Math.max(0, running + (deltas.get(offset) ?? 0));
        return { offset, viewers: running, realViewers: running };
      });
  }

  // ── Chat activity ──────────────────────────────────────────────────────────
  const chatBuckets = new Map<number, { real: number; scripted: number }>();
  for (const message of messages ?? []) {
    const bucket =
      Math.floor(offsetOf(message.sent_at, startsAt) / BUCKET_SECONDS) *
      BUCKET_SECONDS;
    const entry = chatBuckets.get(bucket) ?? { real: 0, scripted: 0 };
    if (message.is_real_user) entry.real += 1;
    else entry.scripted += 1;
    chatBuckets.set(bucket, entry);
  }

  const chat = [...chatBuckets.entries()]
    .map(([offset, value]) => ({ offset, ...value }))
    .sort((a, b) => a.offset - b.offset);

  // ── Drop-off points ────────────────────────────────────────────────────────
  const leaves = new Map<number, number>();
  for (const event of events ?? []) {
    if (event.event_type !== "left_session") continue;
    const bucket =
      Math.floor(offsetOf(event.created_at, startsAt) / BUCKET_SECONDS) *
      BUCKET_SECONDS;
    leaves.set(bucket, (leaves.get(bucket) ?? 0) + 1);
  }

  const dropOffs = [...leaves.entries()]
    .map(([offset, lost]) => ({ offset, lost }))
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 3);

  // ── Offer click timing ─────────────────────────────────────────────────────
  const clickBuckets = new Map<number, number>();
  for (const event of events ?? []) {
    if (event.event_type !== "clicked_offer") continue;
    const bucket =
      Math.floor(offsetOf(event.created_at, startsAt) / BUCKET_SECONDS) *
      BUCKET_SECONDS;
    clickBuckets.set(bucket, (clickBuckets.get(bucket) ?? 0) + 1);
  }

  const offerClicks = [...clickBuckets.entries()]
    .map(([offset, clicks]) => ({ offset, clicks }))
    .sort((a, b) => a.offset - b.offset);

  // ── Peaks ──────────────────────────────────────────────────────────────────
  const peaks = [...chat]
    .map((c) => ({ offset: c.offset, messages: c.real + c.scripted }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 3);

  const people = registrants ?? [];

  return {
    session: {
      id: session.id,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      status: session.status,
    },
    webinar: {
      id: webinar?.id ?? session.webinar_id,
      title: webinar?.title ?? "",
      durationSeconds: duration,
    },
    viewers,
    chat,
    dropOffs,
    offerClicks,
    offerRevealOffset: offer?.trigger_video_offset_seconds ?? null,
    peaks,
    totals: {
      registered: people.length,
      attended: people.filter((r) => r.attended).length,
      peakViewers: viewers.reduce((max, v) => Math.max(max, v.viewers), 0),
      messages: messages?.length ?? 0,
      realMessages: (messages ?? []).filter((m) => m.is_real_user).length,
      clicks: people.filter((r) => r.clicked_offer).length,
      bought: people.filter((r) => r.bought).length,
    },
    fromSnapshots,
  };
}
