import { NextResponse } from "next/server";

import { requireWebinarAccess } from "@/lib/webinar-access";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Polling fallback for the generation status page — no realtime subscription
 * for this table yet, so the builder UI polls this every few seconds while a
 * job is pending/generating.
 */
export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const [{ data: job }, { data: webinar }] = await Promise.all([
    supabase
      .from("autonomous_webinars")
      .select(
        "id, generation_status, script_generated_at, presentation_generated_at, voice_cloned_at, video_assembled_at, personas_generated_at, automation_configured_at, published_at, generation_log, estimated_completion_minutes, error, created_at"
      )
      .eq("webinar_id", webinarId)
      .maybeSingle(),
    supabase.from("webinars").select("title, status, video_url, thumbnail_url").eq("id", webinarId).maybeSingle(),
  ]);

  if (!job) return NextResponse.json({ error: "No generation job for this webinar." }, { status: 404 });

  return NextResponse.json({ job, webinar });
}
