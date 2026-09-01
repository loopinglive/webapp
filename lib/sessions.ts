import "server-only";

import { nextOccurrence } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

/**
 * Makes sure a webinar has its next session on the books.
 *
 * A schedule is a rule; a session is a concrete instance the room can point at.
 * Without this, "every day at 8PM" would run exactly once — the single session
 * created when the schedule was saved.
 *
 * Called two ways: lazily whenever the room asks for a session (so the platform
 * works with no scheduler at all), and from the cron route (so a session exists
 * before the first attendee arrives, which is what the reminder emails in
 * Phase 5 will need).
 */
export async function ensureUpcomingSession(
  supabase: Client,
  webinarId: string
): Promise<string | null> {
  const { data: webinar } = await supabase
    .from("webinars")
    .select("video_duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) return null;
  const duration = webinar.video_duration_seconds ?? 0;

  // Anything still running, or yet to start, means there is nothing to do.
  const { data: existing } = await supabase
    .from("webinar_sessions")
    .select("id, starts_at")
    .eq("webinar_id", webinarId)
    .gte("starts_at", new Date(Date.now() - duration * 1000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(1);

  if (existing?.length) return existing[0].id;

  const { data: schedules } = await supabase
    .from("webinar_schedules")
    .select("*")
    .eq("webinar_id", webinarId)
    .eq("is_active", true);

  if (!schedules?.length) return null;

  // Whichever active schedule comes round first wins.
  let soonest: { scheduleId: string; startsAt: string } | null = null;

  for (const schedule of schedules) {
    const startsAt = nextOccurrence(schedule);
    if (!startsAt) continue;
    if (!soonest || startsAt < soonest.startsAt) {
      soonest = { scheduleId: schedule.id, startsAt };
    }
  }

  if (!soonest) return null;

  const { data: created } = await supabase
    .from("webinar_sessions")
    .insert({
      webinar_id: webinarId,
      schedule_id: soonest.scheduleId,
      starts_at: soonest.startsAt,
      ends_at: new Date(
        new Date(soonest.startsAt).getTime() + duration * 1000
      ).toISOString(),
      status: "scheduled",
    })
    .select("id")
    .single();

  return created?.id ?? null;
}

/** Moves session statuses to match the clock, and retires spent one-offs. */
export async function reconcileSessions(supabase: Client) {
  const now = new Date().toISOString();

  const [{ count: live }, { count: ended }] = await Promise.all([
    supabase
      .from("webinar_sessions")
      .update({ status: "live" }, { count: "exact" })
      .eq("status", "scheduled")
      .lte("starts_at", now)
      .gt("ends_at", now),
    supabase
      .from("webinar_sessions")
      .update({ status: "ended" }, { count: "exact" })
      .neq("status", "ended")
      .lte("ends_at", now),
  ]);

  // A one-time schedule whose moment has passed should stop counting toward
  // the publish checklist.
  const { count: retired } = await supabase
    .from("webinar_schedules")
    .update({ is_active: false }, { count: "exact" })
    .eq("is_recurring", false)
    .eq("is_active", true)
    .lt("scheduled_at", now);

  return { live: live ?? 0, ended: ended ?? 0, retired: retired ?? 0 };
}
