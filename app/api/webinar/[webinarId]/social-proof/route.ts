import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * True numbers for the offer.
 *
 * "14 people bought in this session" is computable from the purchases ledger
 * and more persuasive than anything invented -- and unlike an invented number
 * it cannot be contradicted by the host's own dashboard.
 *
 * Returns nothing rather than a small number: "1 person bought" is worse than
 * silence, and a fabricated floor would defeat the point of using real data.
 */
const MINIMUM_TO_SHOW = 3;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  const supabase = createServiceClient();

  const [{ count: sessionBuyers }, { count: totalBuyers }] = await Promise.all([
    sessionId
      ? supabase
          .from("purchases")
          .select("id", { count: "exact", head: true })
          .eq("webinar_id", webinarId)
          .eq("session_id", sessionId)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("webinar_id", webinarId),
  ]);

  const inSession = sessionBuyers ?? 0;
  const allTime = totalBuyers ?? 0;

  return NextResponse.json({
    // Prefer the live number: what is happening now is more persuasive than a
    // cumulative total, and it is the one that keeps moving.
    show: inSession >= MINIMUM_TO_SHOW || allTime >= MINIMUM_TO_SHOW,
    inSession,
    allTime,
    label:
      inSession >= MINIMUM_TO_SHOW
        ? `${inSession} people bought during this session`
        : allTime >= MINIMUM_TO_SHOW
          ? `${allTime} people have taken this offer`
          : null,
  });
}
