import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

/** Whether a team has an active Enterprise contract — SSO is gated on this, not on teams.plan_slug. */
export async function isEnterpriseTeam(teamId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("enterprise_accounts")
    .select("contract_end_date")
    .eq("team_id", teamId)
    .maybeSingle();

  if (!data) return false;
  if (!data.contract_end_date) return true;
  return new Date(data.contract_end_date).getTime() > Date.now();
}
