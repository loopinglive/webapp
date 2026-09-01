import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { getSessionAnalytics } from "@/lib/analytics/session";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const analytics = await getSessionAnalytics(createServiceClient(), sessionId);

  if (!analytics) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(analytics);
}
