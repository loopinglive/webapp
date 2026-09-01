import "server-only";

import { assignSegment, WATCH_MILESTONES, type Segment } from "@/lib/segments";
import { createServiceClient } from "@/lib/supabase/server";
import type { AttendeeEventType, Json } from "@/types/database";

type Client = ReturnType<typeof createServiceClient>;

/** Fire-and-forget timeline entry. Never fails the request that logged it. */
export async function logEvent(
  supabase: Client,
  input: {
    registrantId: string;
    sessionId?: string | null;
    type: AttendeeEventType;
    data?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("attendee_events").insert({
    registrant_id: input.registrantId,
    session_id: input.sessionId ?? null,
    event_type: input.type,
    event_data: (input.data ?? {}) as Json,
  });

  // A milestone that already exists trips the unique index; that is the index
  // doing its job, not a failure.
  if (error && error.code !== "23505") {
    console.error("attendee_events insert failed:", error.message);
  }
}

/**
 * Recomputes a registrant's segment from their current state and stores it.
 *
 * Called after anything that could move them: attendance, watch progress, an
 * offer click, a manual purchase mark. Segments are never set by hand except
 * BOUGHT, which is what the admin toggle writes to `bought` before calling
 * this.
 */
export async function syncSegment(
  supabase: Client,
  registrantId: string
): Promise<Segment | null> {
  const { data: registrant } = await supabase
    .from("registrants")
    .select("id, webinar_id, session_id, bought, clicked_offer, attended, watch_percentage")
    .eq("id", registrantId)
    .maybeSingle();

  if (!registrant) return null;

  // "Has the webinar passed" decides REGISTERED vs NO_SHOW, so it needs the
  // session they were attached to rather than the clock alone.
  let webinarHasPassed = false;
  if (registrant.session_id) {
    const { data: session } = await supabase
      .from("webinar_sessions")
      .select("starts_at")
      .eq("id", registrant.session_id)
      .maybeSingle();
    webinarHasPassed = session
      ? new Date(session.starts_at).getTime() < Date.now()
      : false;
  }

  const segment = assignSegment(registrant, { webinarHasPassed });

  await Promise.all([
    supabase.from("attendee_segments").upsert(
      {
        webinar_id: registrant.webinar_id,
        registrant_id: registrantId,
        segment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "webinar_id,registrant_id" }
    ),
    supabase
      .from("registrants")
      .update({ watch_depth_segment: segment })
      .eq("id", registrantId),
  ]);

  return segment;
}

/** Logs any watch milestones crossed between two percentages. */
export async function logWatchMilestones(
  supabase: Client,
  input: {
    registrantId: string;
    sessionId: string | null;
    previousPercentage: number;
    percentage: number;
  }
) {
  const crossed = WATCH_MILESTONES.filter(
    (milestone) =>
      input.percentage >= milestone && input.previousPercentage < milestone
  );

  for (const milestone of crossed) {
    await logEvent(supabase, {
      registrantId: input.registrantId,
      sessionId: input.sessionId,
      type: "watch_milestone",
      data: { percent: milestone },
    });
  }
}

/**
 * Wipes a returning non-buyer's history so they re-enter as a new attendee.
 *
 * Buyers never reach this — their history is what tells the follow-up engine to
 * leave them alone.
 */
export async function clearAttendeeHistory(
  supabase: Client,
  registrantId: string
) {
  const now = new Date().toISOString();

  await Promise.all([
    supabase.from("attendee_events").delete().eq("registrant_id", registrantId),
    supabase
      .from("live_chat_messages")
      .delete()
      .eq("registrant_id", registrantId),
  ]);

  await supabase
    .from("registrants")
    .update({
      attended: false,
      joined_at: null,
      left_at: null,
      watch_seconds: 0,
      watch_percentage: 0,
      watch_depth_segment: "none",
      clicked_offer: false,
      offer_clicked_at: null,
      returning_attendee: true,
      history_cleared_at: now,
    })
    .eq("id", registrantId);

  await logEvent(supabase, {
    registrantId,
    type: "history_cleared",
    data: { at: now },
  });
}
