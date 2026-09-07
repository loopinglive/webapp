import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { isEnterpriseTeam } from "@/lib/teams/enterprise";
import { requireTeamCapability } from "@/lib/teams/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Current SSO configuration for a team, minus the certificate body. */
export async function GET(request: Request) {
  const teamId = new URL(request.url).searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const { response: denied } = await requireTeamCapability(teamId, "manage_sso");
  if (denied) return denied;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sso_configurations")
    .select("id, provider, entity_id, sso_url, attribute_mapping, is_active, require_sso, created_at, updated_at")
    .eq("team_id", teamId)
    .maybeSingle();

  return NextResponse.json({
    config: data,
    isEnterprise: await isEnterpriseTeam(teamId),
  });
}

const schema = z.object({
  teamId: z.string().uuid(),
  provider: z.enum(["okta", "azure_ad", "google_workspace", "onelogin", "auth0", "custom"]),
  entityId: z.string().max(500).optional(),
  ssoUrl: z.string().url(),
  certificate: z.string().min(50, "That doesn't look like a full X.509 certificate."),
  attributeMapping: z
    .object({
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      role: z.string().optional(),
    })
    .optional(),
  requireSso: z.boolean().default(false),
});

/**
 * Saves (or replaces) a team's SSO configuration.
 *
 * Enterprise-gated per the Phase 14 SSO rules — checked here on every save,
 * not just at signup, since a contract can lapse.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { account, response: denied } = await requireTeamCapability(parsed.data.teamId, "manage_sso");
  if (denied) return denied;

  if (!(await isEnterpriseTeam(parsed.data.teamId))) {
    return NextResponse.json({ error: "SSO requires an active Enterprise contract." }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sso_configurations")
    .upsert(
      {
        team_id: parsed.data.teamId,
        provider: parsed.data.provider,
        entity_id: parsed.data.entityId ?? null,
        sso_url: parsed.data.ssoUrl,
        certificate: parsed.data.certificate,
        attribute_mapping: parsed.data.attributeMapping ?? {},
        require_sso: parsed.data.requireSso,
        is_active: true,
      },
      { onConflict: "team_id" }
    )
    .select("id, provider, sso_url, require_sso")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    action: "sso.configured",
    resourceType: "sso_configuration",
    resourceId: data.id,
    userId: account.id,
    teamId: parsed.data.teamId,
    newValue: { provider: data.provider, requireSso: data.require_sso },
    request,
  });

  return NextResponse.json({ config: data });
}

export async function DELETE(request: Request) {
  const { teamId } = (await request.json().catch(() => ({}))) as { teamId?: string };
  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const { account, response: denied } = await requireTeamCapability(teamId, "manage_sso");
  if (denied) return denied;

  const supabase = createServiceClient();
  await supabase.from("sso_configurations").delete().eq("team_id", teamId);
  await supabase.from("sso_sessions").delete().eq("team_id", teamId);

  await logAudit({
    action: "sso.disabled",
    resourceType: "sso_configuration",
    resourceId: teamId,
    userId: account.id,
    teamId,
    request,
  });

  return NextResponse.json({ success: true });
}
