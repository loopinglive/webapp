import { NextResponse } from "next/server";

import {
  logEvent,
  logWatchMilestones,
  syncSegment,
} from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type RegistrantUpdate = Database["public"]["Tables"]["registrants"]["Update"];

export const dynamic = "force-dynamic";

// Live viewer count: everyone currently in the room, padded by the personas that
// are "in" the session too.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [{ count: live }, { count: personas }] = await Promise.all([
    supabase
      .from("registrants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("attended", true)
      .is("left_at", null),
    supabase
      .from("fake_personas")
      .select("id", { count: "exact", head: true })
      .eq("webinar_id", webinarId),
  ]);

  return NextResponse.json({ viewers: (live ?? 0) + (personas ?? 0) });
}

// Attendance + watch depth. Called on entry, every 10s while watching, and on
// the way out.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const { registrantId, action, watchSeconds, watchPercentage } =
    (await request.json()) as {
      registrantId?: string;
      action?: "join" | "progress" | "leave";
      watchSeconds?: number;
      watchPercentage?: number;
    };

  if (!registrantId || !action) {
    return NextResponse.json(
      { error: "registrantId and action are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: before } = await supabase
    .from("registrants")
    .select("attended, watch_percentage, session_id, total_sessions_attended")
    .eq("id", registrantId)
    .maybeSingle();

  const patch: RegistrantUpdate =
    action === "join"
      ? {
          attended: true,
          joined_at: now,
          left_at: null,
          last_attended_at: now,
          // Counted once per registrant, on the transition into attending.
          total_sessions_attended: before?.attended
            ? (before.total_sessions_attended ?? 0)
            : (before?.total_sessions_attended ?? 0) + 1,
        }
      : action === "leave"
        ? { left_at: now }
        : {};

  if (typeof watchSeconds === "number") {
    patch.watch_seconds = Math.max(0, Math.round(watchSeconds));
  }
  if (typeof watchPercentage === "number") {
    patch.watch_percentage = Math.min(100, Math.max(0, watchPercentage));
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("registrants")
    .update(patch)
    .eq("id", registrantId)
    .eq("webinar_id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessionId = before?.session_id ?? null;

  if (action === "join" && !before?.attended) {
    await logEvent(supabase, { registrantId, sessionId, type: "joined_session" });
  }
  if (action === "leave") {
    await logEvent(supabase, { registrantId, sessionId, type: "left_session" });
  }

  if (typeof watchPercentage === "number") {
    await logWatchMilestones(supabase, {
      registrantId,
      sessionId,
      previousPercentage: Number(before?.watch_percentage ?? 0),
      percentage: watchPercentage,
    });
  }

  // Watch depth moves people between segments, so this runs on every progress
  // tick — every 10 seconds, not every second.
  await syncSegment(supabase, registrantId);

  return NextResponse.json({ ok: true });
}
