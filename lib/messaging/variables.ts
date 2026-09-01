import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

export function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "") ||
    "http://localhost:3000"
  );
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function humanDuration(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours} hours`;
}

/**
 * Everything a template can reference, resolved at send time.
 *
 * Built fresh for each message rather than stored with it, so a reminder queued
 * a week ago still carries today's next-session date and the host's latest copy.
 */
export async function buildVariables(
  supabase: Client,
  input: {
    registrantId: string;
    webinarId: string;
    sessionId: string | null;
    channel: string;
  }
): Promise<Record<string, string>> {
  const base = appUrl();

  const [
    { data: registrant },
    { data: webinar },
    { data: offer },
    { data: config },
  ] = await Promise.all([
    supabase
      .from("registrants")
      .select("full_name, email, phone")
      .eq("id", input.registrantId)
      .maybeSingle(),
    supabase
      .from("webinars")
      .select("id, title, video_duration_seconds")
      .eq("id", input.webinarId)
      .maybeSingle(),
    supabase
      .from("webinar_offers")
      .select("offer_title, external_url, offer_type, countdown_enabled, countdown_minutes")
      .eq("webinar_id", input.webinarId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("registration_page_config")
      .select("host_name")
      .eq("webinar_id", input.webinarId)
      .maybeSingle(),
  ]);

  const session = input.sessionId
    ? (
        await supabase
          .from("webinar_sessions")
          .select("starts_at, ends_at")
          .eq("id", input.sessionId)
          .maybeSingle()
      ).data
    : null;

  const { data: upcoming } = await supabase
    .from("webinar_sessions")
    .select("starts_at")
    .eq("webinar_id", input.webinarId)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1);

  const { data: replay } = await supabase
    .from("replay_access")
    .select("access_token, expires_at")
    .eq("registrant_id", input.registrantId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSession = upcoming?.[0]?.starts_at ?? null;
  const startsAt = session?.starts_at ? new Date(session.starts_at) : null;
  const endsAt = session?.ends_at ? new Date(session.ends_at) : null;

  const offerUrl =
    offer?.offer_type === "internal"
      ? `${base}/offer/${input.webinarId}`
      : (offer?.external_url ?? `${base}/webinar/${input.webinarId}/register`);

  return {
    name: (registrant?.full_name ?? "").split(/\s+/)[0] ?? "",
    full_name: registrant?.full_name ?? "",
    email: registrant?.email ?? "",
    phone: registrant?.phone ?? "",

    webinar_title: webinar?.title ?? "",
    host_name: config?.host_name ?? "",
    webinar_link: `${base}/webinar/${input.webinarId}/register`,

    webinar_date: startsAt ? dateFmt.format(startsAt) : "",
    webinar_time: startsAt ? timeFmt.format(startsAt) : "",
    time_remaining: endsAt
      ? humanDuration(endsAt.getTime() - Date.now())
      : "",
    next_session_date: nextSession ? dateFmt.format(new Date(nextSession)) : "",
    next_session_time: nextSession ? timeFmt.format(new Date(nextSession)) : "",

    offer_title: offer?.offer_title ?? "",
    offer_url: offerUrl,
    offer_countdown: offer?.countdown_enabled
      ? `This closes ${offer.countdown_minutes} minutes after you open it.`
      : "",
    purchase_date: dateFmt.format(new Date()),

    replay_link: replay ? `${base}/replay/${replay.access_token}` : "",
    replay_expires_at: replay
      ? `${dateFmt.format(new Date(replay.expires_at))}, ${timeFmt.format(new Date(replay.expires_at))}`
      : "",

    unsubscribe_link: `${base}/api/automation/unsubscribe?registrantId=${input.registrantId}&webinarId=${input.webinarId}&channel=${input.channel}`,
  };
}
