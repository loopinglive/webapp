import { NextResponse } from "next/server";

import { spMetadataXml } from "@/lib/sso/saml";

export const dynamic = "force-dynamic";

/**
 * This app's SP metadata for one team — public by design. An IdP admin
 * pastes this URL into Okta/Azure AD/etc. to configure the other side of the
 * trust; it contains no secret, only the entity ID and ACS URL.
 */
export async function GET(request: Request) {
  const teamId = new URL(request.url).searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

  const xml = spMetadataXml(teamId);
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
