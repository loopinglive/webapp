import { NextResponse } from "next/server";

import { getSessionAnalytics } from "@/lib/analytics/session";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSessionAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const access = await requireSessionAccess(sessionId);
  if (!access.ok) return access.response;

  const analytics = await getSessionAnalytics(createServiceClient(), sessionId);

  if (!analytics) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(analytics);
}
