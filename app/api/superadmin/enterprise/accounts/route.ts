import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response: denied } = await requireCapability("view_revenue");
  if (denied) return denied;

  const supabase = createServiceClient();

  const { data: accounts } = await supabase
    .from("enterprise_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  const teamIds = (accounts ?? []).map((account) => account.team_id).filter(Boolean) as string[];
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name, slug").in("id", teamIds)
    : { data: [] };

  const byId = new Map((teams ?? []).map((team) => [team.id, team]));

  return NextResponse.json({
    accounts: (accounts ?? []).map((account) => ({
      ...account,
      team: account.team_id ? (byId.get(account.team_id) ?? null) : null,
    })),
  });
}

const schema = z.object({
  teamId: z.string().uuid(),
  customMaxMembers: z.number().int().min(1).optional(),
  customMaxWebinars: z.number().int().min(0).optional(),
  customMaxAttendeesPerSession: z.number().int().min(1).optional(),
  customPriceMonthly: z.number().min(0).optional(),
  slaResponseHours: z.number().int().min(1).default(4),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  accountManagerId: z.string().uuid().optional(),
  notes: z.string().max(4000).optional(),
});

/**
 * Grants a team enterprise status.
 *
 * The custom limits are written onto the team row itself, not just recorded
 * here — everywhere else in the product reads `teams.max_members` and
 * `teams.max_webinars` directly, and an enterprise_accounts row the rest of
 * the app never looks at would grant nothing.
 */
export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireCapability("view_revenue");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", parsed.data.teamId)
    .maybeSingle();
  if (!team) return NextResponse.json({ error: "No such team." }, { status: 404 });

  const { data: enterpriseAccount, error } = await supabase
    .from("enterprise_accounts")
    .upsert(
      {
        team_id: parsed.data.teamId,
        custom_max_members: parsed.data.customMaxMembers ?? null,
        custom_max_webinars: parsed.data.customMaxWebinars ?? null,
        custom_max_attendees_per_session: parsed.data.customMaxAttendeesPerSession ?? null,
        custom_price_monthly: parsed.data.customPriceMonthly ?? null,
        sla_response_hours: parsed.data.slaResponseHours,
        contract_start_date: parsed.data.contractStartDate || null,
        contract_end_date: parsed.data.contractEndDate || null,
        account_manager_id: parsed.data.accountManagerId || null,
        notes: parsed.data.notes || null,
      },
      { onConflict: "team_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("teams")
    .update({
      plan_slug: "enterprise",
      ...(parsed.data.customMaxMembers ? { max_members: parsed.data.customMaxMembers } : {}),
      ...(parsed.data.customMaxWebinars !== undefined
        ? { max_webinars: parsed.data.customMaxWebinars }
        : {}),
    })
    .eq("id", parsed.data.teamId);

  await supabase.from("admin_actions").insert({
    admin_id: admin.id,
    action: "enterprise_account_granted",
    detail: { teamId: parsed.data.teamId } as never,
  });

  return NextResponse.json({ account: enterpriseAccount });
}
