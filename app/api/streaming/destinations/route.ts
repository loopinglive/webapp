import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { fullRtmpUrl, STREAM_PLATFORMS } from "@/lib/live/platforms";
import { multiStreamStatus, updateMultiStreamUrls } from "@/lib/live/livekit";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

const PLATFORM_IDS = STREAM_PLATFORMS.map((platform) => platform.id);

/** Never returns the real stream key — only enough of it to confirm one is set. */
export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("multi_stream_destinations")
    .select("id, platform, rtmp_url, stream_key, is_active, last_streamed_at, created_at")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    destinations: (data ?? []).map((destination) => ({
      ...destination,
      stream_key: undefined,
      stream_key_set: Boolean(destination.stream_key),
      stream_key_preview: destination.stream_key ? `••••${destination.stream_key.slice(-4)}` : null,
    })),
  });
}

const createSchema = z.object({
  webinarId: z.string().uuid(),
  platform: z.enum(PLATFORM_IDS as [string, ...string[]]),
  rtmpUrl: z.string().url(),
  streamKey: z.string().min(1).max(300),
});

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const access = await requireWebinarAccess(parsed.data.webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("multi_stream_destinations")
    .insert({
      webinar_id: parsed.data.webinarId,
      user_id: access.isPlatformAdmin ? null : access.actorId,
      platform: parsed.data.platform,
      rtmp_url: parsed.data.rtmpUrl,
      stream_key: parsed.data.streamKey,
      is_active: true,
    })
    .select("id, platform, rtmp_url, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    action: "streaming.destination_added",
    resourceType: "multi_stream_destination",
    resourceId: data.id,
    userId: access.isPlatformAdmin ? null : access.actorId,
    newValue: { platform: data.platform },
    request,
  });

  return NextResponse.json({ destination: data });
}

const toggleSchema = z.object({
  destinationId: z.string().uuid(),
  webinarId: z.string().uuid(),
  isActive: z.boolean(),
});

/**
 * Turns one destination on or off — including live, mid-broadcast, via
 * LiveKit's updateStream rather than restarting the whole egress.
 */
export async function PATCH(request: Request) {
  const parsed = toggleSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const access = await requireWebinarAccess(parsed.data.webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  const { data: destination } = await supabase
    .from("multi_stream_destinations")
    .select("id, rtmp_url, stream_key")
    .eq("id", parsed.data.destinationId)
    .eq("webinar_id", parsed.data.webinarId)
    .maybeSingle();

  if (!destination) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase
    .from("multi_stream_destinations")
    .update({ is_active: parsed.data.isActive })
    .eq("id", destination.id);

  // If a stream is already live, apply the change immediately rather than
  // waiting for the next full start.
  const { data: session } = await supabase
    .from("live_sessions")
    .select("room_name")
    .eq("webinar_id", parsed.data.webinarId)
    .is("ended_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (session?.room_name) {
    const status = await multiStreamStatus(session.room_name);
    if (status) {
      const url = fullRtmpUrl(destination.rtmp_url, destination.stream_key);
      await updateMultiStreamUrls(
        status.egressId,
        parsed.data.isActive ? [url] : [],
        parsed.data.isActive ? [] : [url]
      );
    }
  }

  return NextResponse.json({ success: true });
}

const deleteSchema = z.object({ destinationId: z.string().uuid(), webinarId: z.string().uuid() });

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "destinationId and webinarId are required" }, { status: 400 });

  const access = await requireWebinarAccess(parsed.data.webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  await supabase
    .from("multi_stream_destinations")
    .delete()
    .eq("id", parsed.data.destinationId)
    .eq("webinar_id", parsed.data.webinarId);

  return NextResponse.json({ success: true });
}
