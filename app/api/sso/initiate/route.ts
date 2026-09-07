import { NextResponse } from "next/server";

import { SITE } from "@/lib/constants";
import { createIdentityProvider, createServiceProvider } from "@/lib/sso/saml";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Starts the SAML redirect-binding login flow for one team. */
export async function GET(request: Request) {
  const teamId = new URL(request.url).searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: config } = await supabase
    .from("sso_configurations")
    .select("entity_id, sso_url, certificate, is_active")
    .eq("team_id", teamId)
    .maybeSingle();

  if (!config || !config.is_active) {
    return NextResponse.redirect(`${SITE.url}/login?error=sso_not_configured`);
  }

  const sp = createServiceProvider(teamId);
  const idp = createIdentityProvider(config);

  const { context } = sp.createLoginRequest(idp, "redirect");
  return NextResponse.redirect(context);
}
