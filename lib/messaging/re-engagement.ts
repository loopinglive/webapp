import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

/**
 * Brings non-buyers back, weeks after they first showed up.
 *
 * Deliberately conservative — this is the sequence most likely to feel like
 * spam, so every stop condition is checked before anything is queued, and a
 * hard ceiling means it can never run forever.
 *
 * Queued with session_id = NULL on purpose: the outbox's unique key is
 * (registrant_id, session_id, template_key, channel), and NULLs do not collide
 * in Postgres, so the weekly message can legitimately repeat where a
 * session-bound one could not.
 */
export async function scheduleReEngagement(supabase: Client) {
  const now = Date.now();

  const { data: settingsRows } = await supabase
    .from("automation_settings")
    .select("*")
    .eq("re_engagement_enabled", true);

  let queued = 0;

  for (const settings of settingsRows ?? []) {
    const webinarId = settings.webinar_id;

    // Only attendees: someone who never turned up is a no-show, and gets the
    // no-show sequence instead.
    const { data: registrants } = await supabase
      .from("registrants")
      .select("id, session_id, last_attended_at, bought")
      .eq("webinar_id", webinarId)
      .eq("is_test", false)
      .eq("bought", false)
      .eq("attended", true)
      .not("last_attended_at", "is", null);

    if (!registrants?.length) continue;

    const ids = registrants.map((r) => r.id);

    const [{ data: unsubscribed }, { data: sent }, { data: upcoming }] =
      await Promise.all([
        supabase
          .from("unsubscribes")
          .select("registrant_id")
          .eq("webinar_id", webinarId)
          .in("registrant_id", ids),
        supabase
          .from("scheduled_messages")
          .select("registrant_id, scheduled_for, status")
          .eq("webinar_id", webinarId)
          .in("registrant_id", ids)
          .like("template_key", "re_engagement%"),
        // A session still to come means they have signed up again. A test run
        // the host started is not that.
        supabase
          .from("webinar_sessions")
          .select("id")
          .eq("webinar_id", webinarId)
          .eq("is_test", false)
          .gt("starts_at", new Date().toISOString()),
      ]);

    // Unsubscribed on every channel? Nothing to send. Partial opt-outs are
    // handled at dispatch, per channel.
    const optedOut = new Set((unsubscribed ?? []).map((r) => r.registrant_id));
    const upcomingIds = new Set((upcoming ?? []).map((s) => s.id));

    const history = new Map<string, { count: number; last: number }>();
    for (const row of sent ?? []) {
      if (row.status === "cancelled") continue;
      const entry = history.get(row.registrant_id) ?? { count: 0, last: 0 };
      entry.count += 1;
      entry.last = Math.max(entry.last, new Date(row.scheduled_for).getTime());
      history.set(row.registrant_id, entry);
    }

    for (const registrant of registrants) {
      if (optedOut.has(registrant.id)) continue;

      // Registered for something upcoming — they are already coming back.
      if (registrant.session_id && upcomingIds.has(registrant.session_id)) continue;

      const record = history.get(registrant.id) ?? { count: 0, last: 0 };
      if (record.count >= settings.max_re_engagement_messages) continue;

      const attendedAt = new Date(registrant.last_attended_at!).getTime();

      // The first one is measured from when they attended, not from today, so
      // a webinar that ran two months ago does not restart the clock.
      const dueAt = record.count
        ? record.last + settings.re_engagement_frequency_days * 86_400_000
        : attendedAt + settings.re_engagement_delay_days * 86_400_000;

      if (dueAt > now) continue;

      const templateKey =
        record.count === 0 ? "re_engagement_initial" : "re_engagement_weekly";

      const { data: templates } = await supabase
        .from("message_templates")
        .select("*")
        .eq("webinar_id", webinarId)
        .eq("template_key", templateKey)
        .eq("is_active", true);

      const { data: person } = await supabase
        .from("registrants")
        .select("full_name, email, phone")
        .eq("id", registrant.id)
        .maybeSingle();

      if (!templates?.length || !person) continue;

      const { data: inserted } = await supabase
        .from("scheduled_messages")
        .insert(
          templates.map((template) => ({
            webinar_id: webinarId,
            registrant_id: registrant.id,
            session_id: null,
            template_id: template.id,
            template_key: templateKey,
            channel: template.channel,
            recipient_email: person.email,
            recipient_phone: person.phone,
            recipient_name: person.full_name,
            subject: template.subject,
            body: template.body,
            scheduled_for: new Date().toISOString(),
            status: "pending" as const,
          }))
        )
        .select("id");

      queued += inserted?.length ?? 0;
    }
  }

  return queued;
}
