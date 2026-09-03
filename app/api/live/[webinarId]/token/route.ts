import { NextResponse } from "next/server";

import { createAccessToken, liveConfigured } from "@/lib/live/livekit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * An attendee's join token.
 *
 * Subscribe-only, always. canPublish is false in the grant itself rather than
 * being hidden in the UI, because an attendee with dev tools would otherwise
 * be able to publish video into someone else's webinar.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  if (!liveConfigured()) {
    return NextResponse.json({ live: null });
  }

  const { webinarId } = await params;
  const { registrantId } = (await request.json().catch(() => ({}))) as {
    registrantId?: string;
  };

  const supabase = createServiceClient();

  const { data: live } = await supabase
    .from("live_sessions")
    .select("id, room_name, status")
    .eq("webinar_id", webinarId)
    .eq("status", "live")
    .maybeSingle();

  // Nothing broadcasting: the watch room falls back to the recorded video.
  if (!live) return NextResponse.json({ live: null });

  // Verified against the webinar so a registrant id from another webinar
  // cannot be used to join this room.
  const { data: registrant } = registrantId
    ? await supabase
        .from("registrants")
        .select("id, full_name")
        .eq("id", registrantId)
        .eq("webinar_id", webinarId)
        .maybeSingle()
    : { data: null };

  if (!registrant) {
    return NextResponse.json({ error: "Register to watch." }, { status: 403 });
  }

  const token = await createAccessToken({
    roomName: live.room_name,
    identity: `viewer_${registrant.id}`,
    name: registrant.full_name,
    canPublish: false,
  });

  return NextResponse.json({
    live: { id: live.id, status: live.status },
    token,
    serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? null,
  });
}
