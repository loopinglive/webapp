import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Admin action log, plus impersonation sessions.
 *
 * Plan grants used to be recorded in impersonation_logs with a reason string,
 * which was expedient and the wrong table. Both are shown here so the trail
 * reads chronologically regardless of which one an entry came from.
 */
export async function GET() {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createServiceClient();

  const [{ data: actions }, { data: impersonations }] = await Promise.all([
    supabase
      .from("admin_actions")
      .select("id, admin_id, target_user_id, action, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("impersonation_logs")
      .select("id, admin_id, impersonated_user_id, reason, started_at, ended_at")
      .order("started_at", { ascending: false })
      .limit(100),
  ]);

  const ids = [
    ...new Set(
      [
        ...(actions ?? []).flatMap((a) => [a.admin_id, a.target_user_id]),
        ...(impersonations ?? []).flatMap((i) => [i.admin_id, i.impersonated_user_id]),
      ].filter(Boolean)
    ),
  ] as string[];

  const { data: users } = ids.length
    ? await supabase.from("user_accounts").select("id, full_name, email").in("id", ids)
    : { data: [] };

  const byId = new Map((users ?? []).map((u) => [u.id, u]));
  const name = (id: string | null) =>
    id ? (byId.get(id)?.full_name || byId.get(id)?.email || "unknown") : "system";

  const entries = [
    ...(actions ?? []).map((a) => ({
      id: a.id,
      at: a.created_at,
      kind: "action" as const,
      admin: name(a.admin_id),
      target: a.target_user_id ? name(a.target_user_id) : null,
      targetId: a.target_user_id,
      action: a.action,
      detail: a.detail,
    })),
    ...(impersonations ?? []).map((i) => ({
      id: i.id,
      at: i.started_at,
      kind: "impersonation" as const,
      admin: name(i.admin_id),
      target: i.impersonated_user_id ? name(i.impersonated_user_id) : null,
      targetId: i.impersonated_user_id,
      action: i.ended_at ? "impersonated" : "impersonating (open)",
      detail: { reason: i.reason, endedAt: i.ended_at },
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return NextResponse.json({ entries });
}
