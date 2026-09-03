import { NextResponse } from "next/server";

import {
  privateVideosEnabled,
  signedVideoUrl,
  streamUrl,
  videoUrl,
} from "@/lib/cloudinary";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Where to play this webinar's video from.
 *
 * The room asks rather than building the URL itself, so the link in the
 * network tab can be one that expires. When private delivery is off the answer
 * is the same public URL as before — the indirection costs one request and is
 * what makes turning it on a config change rather than a rewrite.
 *
 * Not a hard access control either way. A signed URL narrows the window in
 * which a scraped link is useful; it does not stop the person watching from
 * recording their own screen, and nothing can.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, video_url, video_public_id")
    .eq("id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  /*
   * There has to be a session in play.
   *
   * Not much of a gate — the session id is on the page — but it means the
   * video URL is not readable from the webinar id alone, which is the thing
   * that appears in a public registration link.
   */
  if (sessionId) {
    const { data: session } = await supabase
      .from("webinar_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("webinar_id", webinarId)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
  }

  const publicId = webinar.video_public_id;

  // A webinar whose video was uploaded before Cloudinary was wired in has a
  // URL and no public id; there is nothing to sign, so hand back what it has.
  if (!publicId) {
    return NextResponse.json({
      streamSrc: null,
      src: webinar.video_url,
      signed: false,
    });
  }

  if (!privateVideosEnabled()) {
    return NextResponse.json({
      streamSrc: streamUrl(publicId),
      src: videoUrl(publicId),
      signed: false,
    });
  }

  return NextResponse.json({
    streamSrc: signedVideoUrl(publicId, { format: "m3u8" }),
    src: signedVideoUrl(publicId, { format: "mp4" }),
    signed: true,
    // The room re-asks before this runs out. Reported rather than assumed, so
    // the client does not have to know the server's expiry policy.
    expiresInSeconds: 60 * 60 * 6,
  });
}
