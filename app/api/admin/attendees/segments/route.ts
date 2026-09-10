import { NextResponse } from "next/server";

import { deriveSegments } from "@/lib/attendee-tracking";
import { SEGMENTS } from "@/lib/segments";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

// Counts for the stat cards and the tab badges.
export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  // Derived from the registrant rows rather than read from attendee_segments.
  // That cache is only written when something moves a registrant, and reading
  // it counted anyone missing as REGISTERED — so a webinar whose rows predate
  // the cache showed "2 registered, 0 no-show, 0 watched" after the session
  // had ended, which cannot be true of anybody.
  const segments = await deriveSegments(supabase, webinarId);

  const counts: Record<string, number> = Object.fromEntries(
    SEGMENTS.map((segment) => [segment, 0])
  );

  for (const segment of segments.values()) {
    counts[segment] = (counts[segment] ?? 0) + 1;
  }

  return NextResponse.json({ ...counts, total: segments.size });
}
