import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { getUserAccount } from "@/lib/billing/account";
import { getTeamMembership } from "@/lib/teams/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Reads the audit trail, scoped to who is asking.
 *
 * The platform operator and any super admin (user_accounts.is_admin) see
 * everything. A team owner/admin passing ?teamId sees that team's log. Anyone
 * else sees only their own actions. There is no write endpoint here on
 * purpose — entries are only ever created server-side via lib/audit.ts, never
 * from a client request, so a hostile client cannot forge its own history.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const action = params.get("action");
  const teamId = params.get("teamId");
  const format = params.get("format");
  const limit = Math.min(Number(params.get("limit") ?? 100) || 100, 500);

  const admin = await getAdminUser();
  const account = admin ? null : await getUserAccount();

  if (!admin && !account) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const isSuperAdmin = Boolean(admin) || Boolean(account?.is_admin);
  const supabase = createServiceClient();

  let query = supabase
    .from("audit_logs")
    .select("id, user_id, team_id, action, resource_type, resource_id, old_value, new_value, ip_address, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (isSuperAdmin) {
    if (teamId) query = query.eq("team_id", teamId);
  } else if (teamId) {
    const membership = await getTeamMembership(teamId);
    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json({ error: "Not authorised for this team." }, { status: 403 });
    }
    query = query.eq("team_id", teamId);
  } else {
    query = query.eq("user_id", account!.id);
  }

  if (action) query = query.eq("action", action);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const logs = data ?? [];

  if (format === "csv") {
    const header = "timestamp,user_id,team_id,action,resource_type,resource_id,ip_address\n";
    const rows = logs
      .map((row) =>
        [row.created_at, row.user_id, row.team_id, row.action, row.resource_type, row.resource_id, row.ip_address]
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="audit-log.csv"',
      },
    });
  }

  return NextResponse.json({ logs });
}
