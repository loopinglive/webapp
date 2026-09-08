import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { multiStreamStatus, stopMultiStreamEgress } from "@/lib/live/livekit";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

const schema = z.object({ webinarId: z.string().uuid() });

export async function POST(request: Request) {
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

  if (!session?.room_name) return NextResponse.json({ success: true });

  const status = await multiStreamStatus(session.room_name);
  if (status) await stopMultiStreamEgress(status.egressId);

  await logAudit({
    action: "streaming.stopped",
    resourceType: "webinar",
    resourceId: parsed.data.webinarId,
    userId: access.isPlatformAdmin ? null : access.actorId,
    request,
  });

  return NextResponse.json({ success: true });
}
