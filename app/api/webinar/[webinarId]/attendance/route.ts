import { NextResponse } from "next/server";

import { syncContactInBackground } from "@/lib/integrations/sync";
import { dispatchWebhookInBackground } from "@/lib/webhooks/dispatch";

import {
  logEvent,
  logWatchMilestones,
  syncSegment,
} from "@/lib/attendee-tracking";
import { geoCountry, parseUserAgent } from "@/lib/device";
import { cancelJoinReminders } from "@/lib/messaging/scheduler";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type RegistrantUpdate = Database["public"]["Tables"]["registrants"]["Update"];

export const dynamic = "force-dynamic";

/** Device and geo, read from the request rather than trusted from the client. */
function devicePatch(request: Request) {
  const device = parseUserAgent(request.headers.get("user-agent"));
  const ipCountry = geoCountry(request.headers);

  const patch: Record<string, string | null> = {};
  if (device.deviceType) patch.device_type = device.deviceType;
  if (device.browser) patch.browser = device.browser;
  if (device.os) patch.os = device.os;
  if (ipCountry) patch.ip_country = ipCountry;
  return patch;
}

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
    .select("attended, watch_percentage, session_id, total_sessions_attended, full_name, email, phone")
    .eq("id", registrantId)
    .maybeSingle();

  /*
   * Did this call turn a non-attendee into an attendee?
   *
   * Read-then-write is not good enough here. Two tabs, or a reload during the
   * first ten seconds, both read `attended = false` and both go on to log a
   * join event and increment the session counter — which is how the flag and
   * the event log come to disagree about the same person.
   *
   * So the transition is a compare-and-set: the update only matches while the
   * row still says not-attended, and exactly one caller gets a row back. That
   * caller owns the side effects.
   */
  let wonTheJoin = false;

  if (action === "join") {
    const { data: claimed } = await supabase
      .from("registrants")
      .update({
        attended: true,
        joined_at: now,
        left_at: null,
        last_attended_at: now,
        total_sessions_attended: (before?.total_sessions_attended ?? 0) + 1,
        // Overwrite on join: someone can register on a phone and watch on a
        // laptop, and the device that matters for a viewing chart is the one
        // they actually watched on.
        ...devicePatch(request),
      })
      .eq("id", registrantId)
      .eq("webinar_id", webinarId)
      .eq("attended", false)
      .select("id");

    wonTheJoin = (claimed?.length ?? 0) > 0;
  }

  const patch: RegistrantUpdate =
    action === "join"
      ? // The transition above already wrote everything a first join needs.
        // A repeat join still refreshes the device and the last-seen time,
        // because they are here now whatever the flag said.
        wonTheJoin
        ? {}
        : { left_at: null, last_attended_at: now, ...devicePatch(request) }
      : action === "leave"
        ? { left_at: now }
        : {};

  if (typeof watchSeconds === "number") {
    patch.watch_seconds = Math.max(0, Math.round(watchSeconds));
  }
  if (typeof watchPercentage === "number") {
    patch.watch_percentage = Math.min(100, Math.max(0, watchPercentage));
  }

  // Nothing left to write, and no transition to announce. A progress tick
  // that carried no numbers lands here.
  if (!Object.keys(patch).length && !wonTheJoin) {
    return NextResponse.json({ ok: true });
  }

  if (Object.keys(patch).length) {
    const { error } = await supabase
      .from("registrants")
      .update(patch)
      .eq("id", registrantId)
      .eq("webinar_id", webinarId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const sessionId = before?.session_id ?? null;

  // Resolved once and reused: both the join event and the 90% crossing need
  // the owner, and neither should cost an extra query on every progress tick.
  const needsOwner =
    wonTheJoin ||
    (typeof watchPercentage === "number" &&
      watchPercentage >= 90 &&
      Number(before?.watch_percentage ?? 0) < 90);

  const { data: webinar } = needsOwner
    ? await supabase
        .from("webinars")
        .select("owner_id, title")
        .eq("id", webinarId)
        .maybeSingle()
    : { data: null };

  if (wonTheJoin) {
    await logEvent(supabase, { registrantId, sessionId, type: "joined_session" });
    // They are here — stop telling them to come.
    await cancelJoinReminders(supabase, { registrantId, sessionId });

    dispatchWebhookInBackground(webinar?.owner_id ?? null, "registrant.attended", {
      registrantId,
      name: before?.full_name ?? "",
      email: before?.email ?? "",
      sessionId,
      joinedAt: now,
    });

    syncContactInBackground(
      webinar?.owner_id ?? null,
      "registrant.attended",
      {
        email: before?.email ?? "",
        full_name: before?.full_name ?? null,
        phone: before?.phone ?? null,
      },
      webinar?.title ?? ""
    );
  }

  // Fires once, on the crossing -- not on every tick above 90%.
  if (
    typeof watchPercentage === "number" &&
    watchPercentage >= 90 &&
    Number(before?.watch_percentage ?? 0) < 90
  ) {
    dispatchWebhookInBackground(webinar?.owner_id ?? null, "registrant.completed", {
      registrantId,
      name: before?.full_name ?? "",
      email: before?.email ?? "",
      watchPercentage,
      sessionId,
    });

    syncContactInBackground(
      webinar?.owner_id ?? null,
      "registrant.completed",
      {
        email: before?.email ?? "",
        full_name: before?.full_name ?? null,
        phone: before?.phone ?? null,
      },
      webinar?.title ?? ""
    );
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
