import { NextResponse } from "next/server";

import { ensureUpcomingSession, reconcileSessions } from "@/lib/sessions";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Rolls every published webinar forward.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` on scheduled invocations.
 * Without a secret configured the route refuses to run rather than sitting
 * open — it writes to every webinar on the platform.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const counts = await reconcileSessions(supabase);

  const { data: webinars } = await supabase
    .from("webinars")
    .select("id")
    .eq("status", "published")
    .eq("is_active", true);

  let created = 0;
  for (const webinar of webinars ?? []) {
    const sessionId = await ensureUpcomingSession(supabase, webinar.id);
    if (sessionId) created += 1;
  }

  return NextResponse.json({ ...counts, webinars: webinars?.length ?? 0, created });
}
