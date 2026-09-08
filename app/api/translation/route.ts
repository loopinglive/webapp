import { NextResponse } from "next/server";

import { requireWebinarAccess } from "@/lib/webinar-access";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const [{ data: config }, { count: segmentCount }] = await Promise.all([
    supabase
      .from("real_time_translations")
      .select("source_language, target_languages, transcription_provider, translation_provider, created_at")
      .eq("webinar_id", webinarId)
      .maybeSingle(),
    supabase.from("translation_segments").select("id", { count: "exact", head: true }).eq("webinar_id", webinarId),
  ]);

  return NextResponse.json({ config, segmentCount: segmentCount ?? 0 });
}

export async function DELETE(request: Request) {
  const { webinarId } = (await request.json().catch(() => ({}))) as { webinarId?: string };
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  await supabase.from("translation_segments").delete().eq("webinar_id", webinarId);
  await supabase.from("real_time_translations").delete().eq("webinar_id", webinarId);

  return NextResponse.json({ success: true });
}
