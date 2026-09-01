import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { rollSessionsForward } from "@/lib/sessions";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Manual trigger for the session sweep.
 *
 * The sweep itself runs on pg_cron inside Postgres every five minutes — see
 * 0007_session_scheduler.sql. This route exists so an admin can force a run
 * without waiting, and so the behaviour is reachable from a test.
 *
 * Accepts either the signed-in admin, or a bearer CRON_SECRET for anyone
 * pointing an external scheduler at it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorised =
    (secret && request.headers.get("authorization") === `Bearer ${secret}`) ||
    Boolean(await getAdminUser());

  if (!authorised) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const result = await rollSessionsForward(createServiceClient());

  if ("error" in result) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
