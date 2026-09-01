import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Body = {
  publicId?: string;
  kind?: "video" | "image" | "pdf";
  webinarId?: string;
  /** Where an image lands: the webinar thumbnail, or a persona's avatar. */
  target?: "thumbnail" | "avatar" | "handout";
};

/**
 * Records a finished upload.
 *
 * The client says only which asset it created; the duration and URL are read
 * back from the provider here. A browser could otherwise claim a 10-second
 * video was 90 minutes long, and every timed comment in the room would fire
 * against a wrong clock.
 */
export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { publicId, kind, webinarId, target } = (await request.json()) as Body;

  if (!publicId || !kind) {
    return NextResponse.json(
      { error: "publicId and kind are required" },
      { status: 400 }
    );
  }

  const resourceType =
    kind === "video" ? "video" : kind === "pdf" ? "raw" : "image";

  let asset;
  try {
    asset = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      // Without this the Admin API omits `duration` entirely — the upload
      // response carries it, but a read-back does not. Every video would then
      // look unreadable and be rejected. Verified against the live API.
      ...(kind === "video" ? { media_metadata: true } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "That upload could not be verified. Please try again." },
      { status: 400 }
    );
  }

  const url = asset.secure_url as string;
  const duration = Math.round(Number(asset.duration ?? 0));

  if (kind === "video") {
    if (!webinarId) {
      return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
    }
    if (!duration) {
      return NextResponse.json(
        { error: "That file does not look like a video we can read." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("webinars")
      .update({
        video_url: url,
        video_public_id: publicId,
        video_duration_seconds: duration,
        updated_at: new Date().toISOString(),
      })
      .eq("id", webinarId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Duration is the one storage detail the admin UI does show — it is the
    // canvas every timed comment is placed on.
    return NextResponse.json({ success: true, durationSeconds: duration });
  }

  if (kind === "image" && target === "thumbnail" && webinarId) {
    const supabase = createServiceClient();
    await supabase
      .from("webinars")
      .update({ thumbnail_url: url, updated_at: new Date().toISOString() })
      .eq("id", webinarId);
    return NextResponse.json({ success: true, url });
  }

  // Avatars and handouts are attached by the caller that requested them.
  return NextResponse.json({ success: true, url });
}
