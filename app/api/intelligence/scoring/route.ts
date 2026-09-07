import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

/** The scoring leaderboard for one webinar, joined against the registrant they belong to. */
export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  const { data: scores } = await supabase
    .from("attendee_scores")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("engagement_score", { ascending: false })
    .limit(50);

  const registrantIds = (scores ?? []).map((score) => score.registrant_id);
  const { data: registrants } = registrantIds.length
    ? await supabase
        .from("registrants")
        .select("id, full_name, email, watch_percentage, clicked_offer, bought")
        .in("id", registrantIds)
    : { data: [] };

  const byId = new Map((registrants ?? []).map((registrant) => [registrant.id, registrant]));

  const rows = (scores ?? [])
    .map((score) => ({ ...score, registrant: byId.get(score.registrant_id) ?? null }))
    .filter((row) => row.registrant && !row.registrant.bought);

  const summary = {
    total: rows.length,
    hot: rows.filter((row) => row.engagement_score >= 80).length,
    warm: rows.filter((row) => row.engagement_score >= 60 && row.engagement_score < 80).length,
    cold: rows.filter((row) => row.engagement_score < 40).length,
    averageScore:
      rows.length > 0
        ? Math.round(rows.reduce((sum, row) => sum + row.engagement_score, 0) / rows.length)
        : 0,
  };

  return NextResponse.json({ rows, summary });
}
