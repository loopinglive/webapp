import { NextResponse } from "next/server";

import { MAX_ATTEMPTS, retryWebhookLog } from "@/lib/webhooks/dispatch";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 25;

/**
 * Retry sweep, invoked by pg_cron every five minutes.
 *
 * Vercel's Hobby plan caps cron at once per day, which is why the schedule
 * lives in Postgres and calls back into this route.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const { data: due } = await createServiceClient()
    .from("webhook_logs")
    .select("id")
    .eq("status", "failed")
    .lt("attempt_count", MAX_ATTEMPTS)
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(BATCH);

  if (!due?.length) return NextResponse.json({ retried: 0 });

  const results = await Promise.all(due.map((row) => retryWebhookLog(row.id)));

  return NextResponse.json({
    retried: results.length,
    delivered: results.filter((r) => r.ok).length,
  });
}
