import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import type { PublicJoiner } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Waiting-room social proof: the most recent people to register, plus how many
 * are holding for this session.
 *
 * The registrants table carries emails and phone numbers, so it has no anon RLS
 * policy at all and is never exposed to Supabase Realtime. This route is the
 * only way out, and it hands back first name and flag — nothing else.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");

  const supabase = createServiceClient();

  let recentQuery = supabase
    .from("registrants")
    .select("id, full_name, country_flag, created_at")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false })
    .limit(8);

  let countQuery = supabase
    .from("registrants")
    .select("id", { count: "exact", head: true })
    .eq("webinar_id", webinarId);

  if (sessionId) {
    recentQuery = recentQuery.eq("session_id", sessionId);
    countQuery = countQuery.eq("session_id", sessionId);
  }

  const [{ data: recent, error }, { count }] = await Promise.all([
    recentQuery,
    countQuery,
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const joiners: PublicJoiner[] = (recent ?? []).map((row) => ({
    id: row.id,
    // First name only — the waiting room never needs the rest.
    fullName: row.full_name.split(/\s+/)[0],
    countryFlag: row.country_flag,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ joiners, waiting: count ?? 0 });
}
