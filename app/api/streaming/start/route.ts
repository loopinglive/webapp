import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { liveConfigured, startMultiStreamEgress } from "@/lib/live/livekit";
import { fullRtmpUrl } from "@/lib/live/platforms";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({ webinarId: z.string().uuid() });

/**
 * Starts streaming to every active destination at once.
 *
 * Only available during a real live session (Phase 10) — a fake-live
 * session has no LiveKit room behind it to composite, so there is nothing
 * for egress to read from.
 */
export async function POST(request: Request) {
  if (!liveConfigured()) {
    return NextResponse.json({ error: "Live mode is not configured on this deployment." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(parsed.data.webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("live_sessions")
    .select("room_name")
    .eq("webinar_id", parsed.data.webinarId)
    .is("ended_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session?.room_name) {
    return NextResponse.json({ error: "Start the live session before streaming to other platforms." }, { status: 400 });
  }

  const { data: destinations } = await supabase
    .from("multi_stream_destinations")
    .select("id, rtmp_url, stream_key")
    .eq("webinar_id", parsed.data.webinarId)
    .eq("is_active", true);

  if (!destinations?.length) {
    return NextResponse.json({ error: "Add at least one destination first." }, { status: 400 });
  }

  const urls = destinations.map((destination) => fullRtmpUrl(destination.rtmp_url, destination.stream_key));

  try {
    const egressId = await startMultiStreamEgress(session.room_name, urls);

    await supabase
      .from("multi_stream_destinations")
      .update({ last_streamed_at: new Date().toISOString() })
      .in("id", destinations.map((destination) => destination.id));

    await logAudit({
      action: "streaming.started",
      resourceType: "webinar",
      resourceId: parsed.data.webinarId,
      userId: access.isPlatformAdmin ? null : access.actorId,
      newValue: { destinationCount: destinations.length },
      request,
    });

    return NextResponse.json({ egressId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start streaming." },
      { status: 502 }
    );
  }
}
