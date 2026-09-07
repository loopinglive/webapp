import { NextResponse } from "next/server";

import { recordHealthSnapshot } from "@/lib/intelligence/platform-health-engine";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Hourly snapshot of the platform's own health metrics, for the trend view. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  try {
    const recorded = await recordHealthSnapshot(createServiceClient());
    return NextResponse.json({ recorded: recorded.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
