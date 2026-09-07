import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { SITE } from "@/lib/constants";
import type { TeamRole } from "@/lib/teams/roles";
import { createIdentityProvider, createServiceProvider, extractIdentity } from "@/lib/sso/saml";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_ROLES: TeamRole[] = ["owner", "admin", "editor", "viewer"];

/**
 * Where the IdP posts the SAMLResponse back to.
 *
 * Provisions the account and team membership if this is the first login,
 * then hands the browser a real Supabase session the same way an emailed
 * magic link does — reusing app/auth/confirm/route.ts, which already knows
 * how to turn a token_hash into a session, rather than hand-rolling a second
 * way to mint one.
 */
export async function POST(request: Request) {
  const teamId = new URL(request.url).searchParams.get("teamId");
  if (!teamId) return NextResponse.redirect(`${SITE.url}/login?error=sso_failed`);

  const supabase = createServiceClient();

  const { data: config } = await supabase
    .from("sso_configurations")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();

  if (!config || !config.is_active) {
    return NextResponse.redirect(`${SITE.url}/login?error=sso_not_configured`);
  }

  const formData = await request.formData();
  const body: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") body[key] = value;
  }

  const sp = createServiceProvider(teamId);
  const idp = createIdentityProvider(config);

  let identity;
  try {
    const result = await sp.parseLoginResponse(idp, "post", { body });
    identity = extractIdentity(result.extract, config.attribute_mapping as never);
  } catch {
    // A bad signature, an expired assertion, or a malformed response all
    // fail closed the same way — the specifics are not this browser's to see.
    return NextResponse.redirect(`${SITE.url}/login?error=sso_failed`);
  }

  if (!identity.email) {
    return NextResponse.redirect(`${SITE.url}/login?error=sso_no_email`);
  }

  const { data: team } = await supabase.from("teams").select("id, name").eq("id", teamId).maybeSingle();
  if (!team) return NextResponse.redirect(`${SITE.url}/login?error=sso_failed`);

  // Find or create the account this identity maps to.
  let { data: account } = await supabase
    .from("user_accounts")
    .select("id, team_id")
    .eq("email", identity.email)
    .maybeSingle();

  const fullName = [identity.firstName, identity.lastName].filter(Boolean).join(" ") || identity.email;

  if (!account) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: identity.email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !created.user) {
      return NextResponse.redirect(`${SITE.url}/login?error=sso_failed`);
    }

    const { data: newAccount } = await supabase
      .from("user_accounts")
      .select("id, team_id")
      .eq("id", created.user.id)
      .maybeSingle();
    account = newAccount;
  }

  if (!account) return NextResponse.redirect(`${SITE.url}/login?error=sso_failed`);

  // First login for this team joins them as a member, role mapped from the
  // assertion where the IdP sends one, defaulting to the least-privileged.
  if (account.team_id !== teamId) {
    const mappedRole = VALID_ROLES.includes(identity.role as TeamRole) ? (identity.role as TeamRole) : "viewer";

    await supabase.from("team_members").upsert(
      {
        team_id: teamId,
        user_id: account.id,
        role: mappedRole,
        status: "active",
        accepted_at: new Date().toISOString(),
      },
      { onConflict: "team_id,user_id" }
    );

    await supabase.from("user_accounts").update({ team_id: teamId, team_role: mappedRole }).eq("id", account.id);
  }

  const sessionToken = randomUUID();
  await supabase.from("sso_sessions").insert({
    team_id: teamId,
    user_id: account.id,
    session_token: sessionToken,
    provider: config.provider,
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  });

  await logAudit({
    action: "sso.login",
    resourceType: "user_account",
    resourceId: account.id,
    userId: account.id,
    teamId,
    newValue: { provider: config.provider },
    request,
  });

  // Hands the browser a real session via the same magic-link verification
  // path the app already uses for email logins.
  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: identity.email,
    options: { redirectTo: `${SITE.url}/auth/confirm?next=/dashboard` },
  });

  if (linkError || !link.properties?.hashed_token) {
    return NextResponse.redirect(`${SITE.url}/login?error=sso_failed`);
  }

  return NextResponse.redirect(
    `${SITE.url}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/dashboard`
  );
}
