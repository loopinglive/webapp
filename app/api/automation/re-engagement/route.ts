import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { scheduleReEngagement } from "@/lib/messaging/re-engagement";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sweeps for non-buyers who are due a nudge.
 *
 * Hourly rather than every minute — re-engagement is measured in days, and
 * scanning every registrant sixty times an hour would be pure waste.
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorised =
    (secret && request.headers.get("authorization") === `Bearer ${secret}`) ||
    Boolean(await getAdminUser());

  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queued = await scheduleReEngagement(createServiceClient());
  return NextResponse.json({ ok: true, queued });
}

export const GET = run;
export const POST = run;
