import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * How many people have bought, in this session and recently.
 *
 * True, and computed from the purchases ledger. A host running this product
 * has every incentive to invent a number here; giving them a real one that is
 * usually more persuasive than the invented one is the better trade, and it is
 * the one claim on the page that cannot get them into trouble.
 *
 * Returns nothing below a floor. "1 person bought" is worse than silence, and
 * a number that low also identifies the buyer to anyone else in a small room.
 */
const FLOOR = 3;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  const supabase = createServiceClient();
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();

  const [{ count: thisSession }, { count: today }] = await Promise.all([
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
      .eq("webinar_id", webinarId)
      .gte("created_at", dayAgo),
  ]);

  const session = thisSession ?? 0;
  const recent = today ?? 0;

  // The room's own number first — it is the one that reads as live. The
  // day's number is the fallback for an early session that has none yet.
  if (session >= FLOOR) {
    return NextResponse.json({
      count: session,
      scope: "session",
      message: `${session} people bought during this session`,
    });
  }

  if (recent >= FLOOR) {
    return NextResponse.json({
      count: recent,
      scope: "recent",
      message: `${recent} people bought in the last 24 hours`,
    });
  }

  return NextResponse.json({ count: 0, scope: "none", message: null });
}
