import { NextResponse } from "next/server";

import { getTeamMembership } from "@/lib/teams/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The team, its usage against its limits, and the caller's own membership. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const membership = await getTeamMembership(teamId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this team." }, { status: 403 });
  }

  const supabase = createServiceClient();

  const [{ data: team }, { count: memberCount }, { count: webinarCount }] =
    await Promise.all([
      supabase.from("teams").select("*").eq("id", teamId).maybeSingle(),
      supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "active"),
      supabase
        .from("webinars")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId),
    ]);

  if (!team) return NextResponse.json({ error: "No such team." }, { status: 404 });

  return NextResponse.json({
    team,
    role: membership.role,
    usage: {
      members: memberCount ?? 0,
      webinars: webinarCount ?? 0,
    },
  });
}
