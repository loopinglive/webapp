import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

/**
 * Issues a replay link for one attendee of one session.
 *
 * Per-attendee rather than per-session, so a link identifies who is watching
 * and expiry can be enforced individually. Buyers are excluded by the caller —
 * they have the offer, they do not need the pitch again.
 */
export async function generateReplayAccess(
  supabase: Client,
  input: {
    webinarId: string;
    sessionId: string;
    registrantId: string;
    durationHours: number;
  }
) {
  const expiresAt = new Date(
    Date.now() + input.durationHours * 3600_000
  ).toISOString();

  const { data, error } = await supabase
    .from("replay_access")
    .upsert(
      {
        webinar_id: input.webinarId,
        session_id: input.sessionId,
        registrant_id: input.registrantId,
        expires_at: expiresAt,
        is_active: true,
      },
      { onConflict: "registrant_id,session_id", ignoreDuplicates: false }
    )
    .select("access_token, expires_at")
    .single();

  if (error) return null;
  return data;
}

/** Creates replay links for everyone on a session who did not buy. */
export async function generateSessionReplays(
  supabase: Client,
  sessionId: string
) {
  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("id, webinar_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return 0;

  const { data: settings } = await supabase
    .from("automation_settings")
    .select("replay_enabled, replay_duration_hours")
    .eq("webinar_id", session.webinar_id)
    .maybeSingle();

  if (settings && !settings.replay_enabled) return 0;

  const { data: registrants } = await supabase
    .from("registrants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("bought", false);

  let created = 0;
  for (const registrant of registrants ?? []) {
    const result = await generateReplayAccess(supabase, {
      webinarId: session.webinar_id,
      sessionId,
      registrantId: registrant.id,
      durationHours: settings?.replay_duration_hours ?? 48,
    });
    if (result) created += 1;
  }

  return created;
}
