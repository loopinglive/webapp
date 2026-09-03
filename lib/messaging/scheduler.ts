import "server-only";

import { TEMPLATE_BY_KEY, TEMPLATE_DEFS } from "@/lib/messaging/defaults";
import type { Channel } from "@/lib/messaging/providers";
import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

/** Reminders that stop mattering the moment someone is in the room. */
export const JOIN_REMINDERS = [
  "reminder_24h",
  "reminder_1h",
  "reminder_15min",
  "reminder_now",
];

export async function getSettings(supabase: Client, webinarId: string) {
  const { data } = await supabase
    .from("automation_settings")
    .select("*")
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (data) return data;

  const { data: created } = await supabase
    .from("automation_settings")
    .insert({ webinar_id: webinarId })
    .select("*")
    .single();

  return created;
}

/** Creates the full default template set for a webinar, once. */
export async function seedTemplates(supabase: Client, webinarId: string) {
  const { count } = await supabase
    .from("message_templates")
    .select("id", { count: "exact", head: true })
    .eq("webinar_id", webinarId);

  if ((count ?? 0) > 0) return 0;

  const rows = TEMPLATE_DEFS.flatMap((def) =>
    Object.entries(def.channels).map(([channel, content]) => ({
      webinar_id: webinarId,
      template_key: def.key,
      trigger_type: def.triggerType,
      segment: def.segment,
      channel: channel as Channel,
      subject: content.subject ?? null,
      body: content.body,
      delay_hours: def.offsetHours,
    }))
  );

  const { data } = await supabase
    .from("message_templates")
    .upsert(rows, { onConflict: "webinar_id,template_key,channel", ignoreDuplicates: true })
    .select("id");

  return data?.length ?? 0;
}

type QueueInput = {
  webinarId: string;
  registrantId: string;
  sessionId: string | null;
  templateKey: string;
  when: Date;
};

/**
 * Puts one message in the outbox.
 *
 * The body is *not* resolved here — variables are filled at send time, so a
 * message queued a week ago still goes out with the right countdown, the right
 * next-session date, and any template edit the host has made since.
 *
 * Channel enablement, unsubscribes and buyer status are checked at send time
 * too, for the same reason: a lot can change between queueing and sending.
 */
async function queue(supabase: Client, input: QueueInput) {
  const def = TEMPLATE_BY_KEY.get(input.templateKey);
  if (!def) return 0;

  const [{ data: templates }, { data: registrant }] = await Promise.all([
    supabase
      .from("message_templates")
      .select("*")
      .eq("webinar_id", input.webinarId)
      .eq("template_key", input.templateKey)
      .eq("is_active", true),
    supabase
      .from("registrants")
      .select("full_name, email, phone")
      .eq("id", input.registrantId)
      .maybeSingle(),
  ]);

  if (!templates?.length || !registrant) return 0;

  const rows = templates.map((template) => ({
    webinar_id: input.webinarId,
    registrant_id: input.registrantId,
    session_id: input.sessionId,
    template_id: template.id,
    template_key: input.templateKey,
    channel: template.channel,
    status: "pending" as const,
    recipient_email: registrant.email,
    recipient_phone: registrant.phone,
    recipient_name: registrant.full_name,
    subject: template.subject,
    body: template.body,
    scheduled_for: input.when.toISOString(),
  }));

  const { data } = await supabase
    .from("scheduled_messages")
    .upsert(rows, {
      onConflict: "registrant_id,session_id,template_key,channel",
      ignoreDuplicates: true,
    })
    .select("id");

  return data?.length ?? 0;
}

/** Everything a new registration should receive, from confirmation to reminders. */
export async function scheduleRegistrationMessages(
  supabase: Client,
  input: { webinarId: string; registrantId: string; sessionId: string | null }
) {
  const now = new Date();
  let scheduled = await queue(supabase, {
    ...input,
    templateKey: "registration_confirmation",
    when: now,
  });

  if (!input.sessionId) return scheduled;

  const [{ data: session }, { data: webinar }] = await Promise.all([
    supabase
      .from("webinar_sessions")
      .select("starts_at, is_test")
      .eq("id", input.sessionId)
      .maybeSingle(),
    supabase
      .from("webinars")
      .select("video_duration_seconds")
      .eq("id", input.webinarId)
      .maybeSingle(),
  ]);

  if (!session) return scheduled;

  // A test run must not send anything. The host is the only registrant, and a
  // reminder for a session they invented to look at is noise at best — at
  // worst it is a reminder that arrives after they have forgotten previewing.
  if (session.is_test) return scheduled;

  const startsAt = new Date(session.starts_at).getTime();
  const duration = (webinar?.video_duration_seconds ?? 0) * 1000;

  const timings: [string, number][] = [
    ["reminder_24h", startsAt - 24 * 3600_000],
    ["reminder_1h", startsAt - 3600_000],
    ["reminder_15min", startsAt - 15 * 60_000],
    ["reminder_now", startsAt],
    // An hour before the video runs out, to catch late joiners.
    ["reminder_ending_soon", startsAt + duration - 3600_000],
  ];

  for (const [templateKey, at] of timings) {
    // A reminder whose moment has already passed is noise, not a reminder.
    if (at <= now.getTime()) continue;
    scheduled += await queue(supabase, {
      ...input,
      templateKey,
      when: new Date(at),
    });
  }

  return scheduled;
}

/** They are in the room — the "come to the room" reminders are moot. */
export async function cancelJoinReminders(
  supabase: Client,
  input: { registrantId: string; sessionId: string | null }
) {
  const query = supabase
    .from("scheduled_messages")
    .update({ status: "cancelled" })
    .eq("registrant_id", input.registrantId)
    .eq("status", "pending")
    .in("template_key", JOIN_REMINDERS);

  await (input.sessionId ? query.eq("session_id", input.sessionId) : query);
}

/** Buyers leave every sequence they were in, and get their receipt. */
export async function handlePurchase(
  supabase: Client,
  input: { webinarId: string; registrantId: string; sessionId: string | null }
) {
  await supabase
    .from("scheduled_messages")
    .update({ status: "cancelled" })
    .eq("registrant_id", input.registrantId)
    .eq("status", "pending");

  return queue(supabase, {
    ...input,
    templateKey: "buyer_confirmation",
    when: new Date(),
  });
}

/**
 * The segmented follow-up, fired once a session has ended.
 *
 * Each attendee gets exactly the sequence their behaviour earned, and buyers
 * get a receipt instead of a pitch.
 */
export async function schedulePostWebinarMessages(
  supabase: Client,
  sessionId: string
) {
  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("id, webinar_id, ends_at, starts_at, is_test")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return 0;
  if (session.is_test) return 0;

  const webinarId = session.webinar_id;
  const settings = await getSettings(supabase, webinarId);
  const endsAt = new Date(session.ends_at ?? session.starts_at).getTime();

  const [{ data: registrants }, { data: segments }] = await Promise.all([
    supabase
      .from("registrants")
      .select("id, bought")
      .eq("session_id", sessionId),
    supabase
      .from("attendee_segments")
      .select("registrant_id, segment")
      .eq("webinar_id", webinarId),
  ]);

  const segmentBy = new Map(
    (segments ?? []).map((row) => [row.registrant_id, row.segment])
  );

  const BY_SEGMENT: Record<string, string> = {
    NO_SHOW: "followup_no_show",
    WATCHED_LOW: "followup_watched_low",
    WATCHED_MID_LOW: "followup_watched_mid_low",
    WATCHED_MID_HIGH: "followup_watched_mid_high",
    WATCHED_HIGH: "followup_watched_high",
    WATCHED_COMPLETE: "followup_watched_complete",
    CLICKED_OFFER: "followup_clicked_offer",
  };

  let scheduled = 0;

  for (const registrant of registrants ?? []) {
    const segment = segmentBy.get(registrant.id) ?? "REGISTERED";

    if (registrant.bought || segment === "BOUGHT") {
      scheduled += await queue(supabase, {
        webinarId,
        registrantId: registrant.id,
        sessionId,
        templateKey: "buyer_confirmation",
        when: new Date(),
      });
      continue;
    }

    const templateKey = BY_SEGMENT[segment];
    if (templateKey) {
      const def = TEMPLATE_BY_KEY.get(templateKey);
      scheduled += await queue(supabase, {
        webinarId,
        registrantId: registrant.id,
        sessionId,
        templateKey,
        when: new Date(endsAt + (def?.offsetHours ?? 1) * 3600_000),
      });
    }

    // Replay goes to everyone who did not buy — including no-shows, who may
    // still watch it.
    if (settings?.replay_enabled) {
      scheduled += await queue(supabase, {
        webinarId,
        registrantId: registrant.id,
        sessionId,
        templateKey: "replay_access",
        when: new Date(endsAt + 0.5 * 3600_000),
      });
    }
  }

  return scheduled;
}
