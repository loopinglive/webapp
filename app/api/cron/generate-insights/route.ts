import { NextResponse } from "next/server";

import { generateInsightsForWebinar } from "@/lib/intelligence/insights-engine";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 280;

/** Daily sweep: fresh insight cards for every active, published webinar. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: webinars } = await supabase
    .from("webinars")
    .select("id, owner_id")
    .eq("is_active", true)
    .eq("status", "published");

  let generated = 0;
  let failed = 0;

  for (const webinar of webinars ?? []) {
    try {
      const inserted = await generateInsightsForWebinar(supabase, webinar.id, webinar.owner_id);
      generated += inserted.length;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ generated, failed, webinars: webinars?.length ?? 0 });
}
