import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

/**
 * Makes sure a webinar has its next session on the books.
 *
 * A schedule is a rule; a session is a concrete instance the room can point at.
 * Without this, "every day at 8PM" would run exactly once — the single session
 * created when the schedule was saved.
 *
 * The work happens in Postgres (see 0007_session_scheduler.sql), which is also
 * where the pg_cron job calls it from every five minutes. Keeping one
 * implementation means the lazy path a viewer triggers and the scheduled sweep
 * can never disagree about when a webinar runs.
 */
export async function ensureUpcomingSession(
  supabase: Client,
  webinarId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("ensure_upcoming_session", {
    p_webinar_id: webinarId,
  });

  if (error) {
    console.error("ensure_upcoming_session failed:", error.message);
    return null;
  }

  return data ?? null;
}

/**
 * Runs the whole sweep by hand.
 *
 * pg_cron does this on its own schedule; this exists so the admin can force it
 * and so the behaviour is testable without waiting five minutes.
 */
export async function rollSessionsForward(supabase: Client) {
  const { data, error } = await supabase.rpc("roll_sessions_forward", {});

  if (error) {
    return { error: error.message };
  }

  return (data ?? {}) as Record<string, number>;
}
