import "server-only";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";
import { teamRoleCan, type TeamCapability, type TeamRole } from "@/lib/teams/roles";

export {
  ROLES,
  TEAM_ROLE_DESCRIPTIONS,
  TEAM_ROLE_LABELS,
  teamRoleCan,
  type TeamCapability,
  type TeamRole,
} from "@/lib/teams/roles";

/**
 * The signed-in user's membership on a given team, or null if they have none.
 *
 * `status = 'pending'` does not count as membership here — an invitation that
 * has not been accepted grants nothing. Every gate below reads through this,
 * so accepting is the one place that turns a pending row into real access.
 */
export async function getTeamMembership(teamId: string) {
  const account = await getUserAccount();
  if (!account) return null;

  const { data } = await createServiceClient()
    .from("team_members")
    .select("role, status")
    .eq("team_id", teamId)
    .eq("user_id", account.id)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  return { account, role: data.role as TeamRole };
}

/**
 * Gate for a team-scoped route.
 *
 * Returns a response to send when refused, so callers stay a single early
 * return — the same shape as `requireCapability` on the super-admin side.
 */
export async function requireTeamCapability(
  teamId: string,
  capability: TeamCapability
) {
  const membership = await getTeamMembership(teamId);

  if (!membership) {
    return {
      account: null,
      role: null,
      response: Response.json(
        { error: "Not a member of this team." },
        { status: 403 }
      ),
    } as const;
  }

  if (!teamRoleCan(membership.role, capability)) {
    return {
      account: membership.account,
      role: membership.role,
      response: Response.json(
        {
          error: `Your role (${membership.role}) cannot do that.`,
          requiredCapability: capability,
        },
        { status: 403 }
      ),
    } as const;
  }

  return { account: membership.account, role: membership.role, response: null } as const;
}
