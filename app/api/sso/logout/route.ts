import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { requireTeamCapability } from "@/lib/teams/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Forces every SSO session for a team to re-authenticate — useful when an
 * employee leaves.
 *
 * Expires this app's own sso_sessions tracking immediately, which is what
 * requireSso enforcement in the dashboard layout reads. It does not revoke
 * the underlying Supabase refresh token already sitting in someone's
 * browser — that stays valid until it naturally expires or they sign out —
 * so this is "stop trusting this SSO session for anything that checks it",
 * not an instant kill switch on an already-open browser tab.
 */
export async function POST(request: Request) {
  const { teamId } = (await request.json().catch(() => ({}))) as { teamId?: string };
  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const { account, response: denied } = await requireTeamCapability(teamId, "manage_sso");
  if (denied) return denied;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sso_sessions")
    .update({ expires_at: new Date().toISOString() })
    .eq("team_id", teamId)
    .gt("expires_at", new Date().toISOString())
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    action: "sso.force_logout",
    resourceType: "team",
    resourceId: teamId,
    userId: account.id,
    teamId,
    newValue: { sessionsExpired: data?.length ?? 0 },
    request,
  });

  return NextResponse.json({ sessionsExpired: data?.length ?? 0 });
}
