import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { posterUrl } from "@/lib/cloudinary";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Grabs a still from the video and uses it as the thumbnail.
 *
 * The frame is produced by a transformation on the video that is already
 * uploaded, so there is nothing to upload and nothing to store twice.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { atSecond } = (await request.json()) as { atSecond?: number };

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("video_public_id, video_duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar?.video_public_id) {
    return NextResponse.json(
      { error: "Upload a video before generating a thumbnail." },
      { status: 400 }
    );
  }

  const duration = webinar.video_duration_seconds ?? 0;
  const second = Math.max(
    0,
    Math.min(Math.round(atSecond ?? 1), Math.max(0, duration - 1))
  );

  const url = posterUrl(webinar.video_public_id, second);

  const { error } = await supabase
    .from("webinars")
    .update({ thumbnail_url: url, updated_at: new Date().toISOString() })
    .eq("id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url });
}
