import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { generateReplayAccess, generateSessionReplays } from "@/lib/replay";
import { appUrl } from "@/lib/messaging/variables";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Issues replay access by hand.
 *
 * Pass a registrantId for one person, or just a sessionId to cover everyone on
 * that session who did not buy — useful when a host extends a replay window
 * after the automatic pass has already run.
 */
export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { sessionId, registrantId, durationHours } = (await request.json()) as {
    sessionId?: string;
    registrantId?: string;
    durationHours?: number;
  };

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("id, webinar_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!registrantId) {
    const created = await generateSessionReplays(supabase, sessionId);
    return NextResponse.json({ success: true, created });
  }

  const { data: settings } = await supabase
    .from("automation_settings")
    .select("replay_duration_hours")
    .eq("webinar_id", session.webinar_id)
    .maybeSingle();

  const access = await generateReplayAccess(supabase, {
    webinarId: session.webinar_id,
    sessionId,
    registrantId,
    durationHours:
      durationHours ?? settings?.replay_duration_hours ?? 48,
  });

  if (!access) {
    return NextResponse.json(
      { error: "Could not issue replay access." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    url: `${appUrl()}/replay/${access.access_token}`,
    expiresAt: access.expires_at,
  });
}
