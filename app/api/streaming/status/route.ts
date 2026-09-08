import { NextResponse } from "next/server";

import { multiStreamStatus } from "@/lib/live/livekit";
import { platformLabel } from "@/lib/live/platforms";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

/** Polled by StreamStatusMonitor while a stream is (or might be) live. */
export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data: session } = await supabase
    .from("live_sessions")
    .select("room_name")
    .eq("webinar_id", webinarId)
    .is("ended_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session?.room_name) return NextResponse.json({ live: false, destinations: [] });

  const status = await multiStreamStatus(session.room_name);
  if (!status) return NextResponse.json({ live: false, destinations: [] });

  const { data: destinations } = await supabase
    .from("multi_stream_destinations")
    .select("platform, rtmp_url")
    .eq("webinar_id", webinarId);

  const byUrlPrefix = new Map((destinations ?? []).map((destination) => [destination.rtmp_url, destination.platform]));

  return NextResponse.json({
    live: true,
    destinations: status.destinations.map((destination) => {
      const matchedPlatform = Array.from(byUrlPrefix.entries()).find(([rtmpUrl]) =>
        destination.url.startsWith(rtmpUrl.replace(/\/$/, ""))
      );
      return {
        url: destination.url,
        platform: matchedPlatform ? platformLabel(matchedPlatform[1]) : "Custom",
        status: destination.status,
        error: destination.error,
      };
    }),
  });
}
