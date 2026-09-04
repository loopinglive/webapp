import { NextResponse } from "next/server";

import { scoreRegistrant } from "@/lib/intelligence/scoring-engine";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** How far back a webinar's activity counts as "recent enough to keep scoring". */
const ACTIVITY_WINDOW_DAYS = 30;

/**
 * Rescoring every attendee of every recently active webinar.
 *
 * Daily rather than real-time: a score that is a few hours stale is fine for
 * "who should I follow up with today", and rescoring on every chat message
 * or watch-percentage tick would be a write on `attendee_scores` for
 * everyone in every room, all the time, for a number nobody is looking at
 * that often.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 86_400_000).toISOString();

  const { data: activeRegistrants } = await supabase
    .from("registrants")
    .select("id, webinar_id")
    .eq("attended", true)
    .eq("is_test", false)
    .gte("last_attended_at", since);

  let scored = 0;
  let failed = 0;

  for (const registrant of activeRegistrants ?? []) {
    try {
      await scoreRegistrant(supabase, registrant.id, registrant.webinar_id);
      scored += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ scored, failed, total: activeRegistrants?.length ?? 0 });
}
