import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { dispatchDue } from "@/lib/messaging/dispatch";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Drains the outbox.
 *
 * Called every minute by pg_cron inside Supabase (see 0009), not by a Vercel
 * cron — the Hobby plan caps those at once a day, which is useless for a
 * queue that has to fire reminders on the minute.
 *
 * Also reachable by a signed-in admin, so the behaviour can be forced and
 * tested without waiting.
 */
async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorised =
    (secret && request.headers.get("authorization") === `Bearer ${secret}`) ||
    Boolean(await getAdminUser());

  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const counts = await dispatchDue(createServiceClient());
  return NextResponse.json({ ok: true, ...counts });
}

export const GET = run;
export const POST = run;
