import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { SEGMENTS } from "@/lib/segments";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Counts for the stat cards and the tab badges.
export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [{ data: rows, error }, { count: total }] = await Promise.all([
    supabase
      .from("attendee_segments")
      .select("segment")
      .eq("webinar_id", webinarId),
    supabase
      .from("registrants")
      .select("id", { count: "exact", head: true })
      .eq("webinar_id", webinarId),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts: Record<string, number> = Object.fromEntries(
    SEGMENTS.map((segment) => [segment, 0])
  );

  for (const row of rows ?? []) {
    counts[row.segment] = (counts[row.segment] ?? 0) + 1;
  }

  // Registrants with no segment row yet have simply not been processed — they
  // are registered.
  const assigned = (rows ?? []).length;
  counts.REGISTERED += Math.max(0, (total ?? 0) - assigned);

  return NextResponse.json({ ...counts, total: total ?? 0 });
}
