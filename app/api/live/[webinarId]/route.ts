import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { getUserAccount } from "@/lib/billing/account";
import { planPermissions } from "@/lib/billing/plans";
import {
  closeRoom,
  createAccessToken,
  liveConfigured,
  participantCount,
  roomNameFor,
  startRecording,
  stopRecording,
} from "@/lib/live/livekit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The host's side of a broadcast: backstage, live, and ending.
 *
 * One route with an `action` rather than four, because the states are a
 * sequence over a single row and splitting them across files would scatter the
 * invariant that only one broadcast per webinar may be in flight.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: live } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("webinar_id", webinarId)
    .in("status", ["backstage", "live"])
    .maybeSingle();

  // People already waiting. This is the number that makes a host press start.
  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("id, starts_at, status")
    .eq("webinar_id", webinarId)
    .in("status", ["scheduled", "live"])
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { count: waiting } = session
    ? await supabase
        .from("registrants")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id)
    : { count: 0 };

  const viewers = live?.status === "live" ? await participantCount(live.room_name) : 0;

  const { data: segments } = live
    ? await supabase
        .from("live_segments")
        .select("*")
        .eq("live_session_id", live.id)
        .order("offset_seconds", { ascending: true })
    : { data: [] };

  return NextResponse.json({
    configured: liveConfigured(),
    live,
    segments: segments ?? [],
    upcomingSession: session,
    waitingCount: waiting ?? 0,
    viewers,
    serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { user, response: denied } = await requireAdmin();
  if (denied) return denied;

  if (!liveConfigured()) {
    return NextResponse.json(
      { error: "Live broadcasting is not configured on this deployment." },
      { status: 503 }
    );
  }

  const { webinarId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: "backstage" | "go_live" | "end" | "segment";
    sessionId?: string | null;
    title?: string;
    kind?: string;
    sourceUrl?: string | null;
    label?: string | null;
  };

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, owner_id")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "No such webinar." }, { status: 404 });
  }

  // Going live is a paid action, like publishing. Backstage is not — a free
  // account should be able to test their camera before being asked to pay.
  if (body.action === "go_live") {
    const permissions = planPermissions(await getUserAccount());
    if (!permissions.canGoLive) {
      return NextResponse.json(
        { error: "Going live requires a paid plan.", upgradeRequired: true },
        { status: 402 }
      );
    }
  }

  const { data: existing } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("webinar_id", webinarId)
    .in("status", ["backstage", "live"])
    .maybeSingle();

  // ── Enter backstage ──
  if (body.action === "backstage") {
    if (existing) {
      const token = await createAccessToken({
        roomName: existing.room_name,
        identity: "host",
        name: "Host",
        canPublish: true,
      });
      return NextResponse.json({ live: existing, token });
    }

    const account = await getUserAccount();
    const id = crypto.randomUUID();

    const { data: created, error } = await supabase
      .from("live_sessions")
      .insert({
        id,
        webinar_id: webinarId,
        session_id: body.sessionId ?? null,
        host_id: account?.id ?? null,
        room_name: roomNameFor(webinarId, id),
        status: "backstage",
        title: body.title ?? webinar.title,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const token = await createAccessToken({
      roomName: created.room_name,
      identity: "host",
      name: user.email ?? "Host",
      canPublish: true,
    });

    return NextResponse.json({ live: created, token });
  }

  if (!existing) {
    return NextResponse.json({ error: "No broadcast in progress." }, { status: 400 });
  }

  // ── Go live ──
  if (body.action === "go_live") {
    if (existing.status === "live") {
      return NextResponse.json({ live: existing });
    }

    // Recording starts here, not at room creation, so the backstage
    // microphone test never reaches the replay.
    let egressId: string | null = null;
    let recordingError: string | null = null;
    try {
      egressId = await startRecording(existing.room_name);
    } catch (error) {
      // A failed recording must not stop the broadcast, but the host has to
      // be told — discovering it a week later when converting is worse.
      recordingError = (error as Error).message.slice(0, 300);
    }

    const now = new Date().toISOString();

    const { data: updated } = await supabase
      .from("live_sessions")
      .update({
        status: "live",
        started_at: now,
        egress_id: egressId,
        recording_error: recordingError,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    await supabase.from("live_segments").insert({
      live_session_id: existing.id,
      kind: "camera",
      label: "Live camera",
      offset_seconds: 0,
    });

    // The attendee watch room reads webinar_sessions, so mark it live too.
    if (existing.session_id) {
      await supabase
        .from("webinar_sessions")
        .update({ status: "live" })
        .eq("id", existing.session_id);
    }

    return NextResponse.json({ live: updated, recordingError });
  }

  // ── Record a segment change ──
  if (body.action === "segment") {
    const startedAt = existing.started_at
      ? new Date(existing.started_at).getTime()
      : Date.now();
    const offset = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

    // Close the open segment before opening the next one.
    await supabase
      .from("live_segments")
      .update({ ended_at: new Date().toISOString() })
      .eq("live_session_id", existing.id)
      .is("ended_at", null);

    const { data: segment } = await supabase
      .from("live_segments")
      .insert({
        live_session_id: existing.id,
        kind: body.kind ?? "camera",
        source_url: body.sourceUrl ?? null,
        label: body.label ?? null,
        offset_seconds: offset,
      })
      .select("*")
      .single();

    return NextResponse.json({ segment });
  }

  // ── End ──
  if (body.action === "end") {
    // Idempotent: a second click, or a webhook arriving late, must not
    // double-stop egress or corrupt the row.
    if (existing.status !== "live") {
      return NextResponse.json({ live: existing });
    }

    if (existing.egress_id) await stopRecording(existing.egress_id);
    await closeRoom(existing.room_name);

    const startedAt = existing.started_at ? new Date(existing.started_at) : new Date();
    const duration = Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 1000));

    await supabase
      .from("live_segments")
      .update({ ended_at: new Date().toISOString() })
      .eq("live_session_id", existing.id)
      .is("ended_at", null);

    const { data: updated } = await supabase
      .from("live_sessions")
      .update({
        // Only "processing" if there is actually a recording coming.
        status: existing.egress_id ? "processing" : "ended",
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (existing.session_id) {
      await supabase
        .from("webinar_sessions")
        .update({ status: "ended", ends_at: new Date().toISOString() })
        .eq("id", existing.session_id);
    }

    return NextResponse.json({ live: updated });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
