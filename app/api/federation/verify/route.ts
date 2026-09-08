import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { callPartner, federationConfigured } from "@/lib/federation/protocol";
import { decryptSecret } from "@/lib/white-label/crypto";
import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Calls the partner with the key they issued us.
 *
 * This is the one thing that makes an otherwise untestable feature
 * verifiable: a host can prove the link works in both directions before
 * relying on it, and see the partner's actual error text if it doesn't.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!federationConfigured()) {
    return NextResponse.json({ error: "Federation is not configured on this deployment." }, { status: 503 });
  }

  const { id, action, emails } = (await request.json().catch(() => ({}))) as {
    id?: string;
    action?: "ping" | "audience_share" | "analytics_summary";
    emails?: string[];
  };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: partnership } = await supabase
    .from("platform_federation")
    .select("id, partner_platform_url, partner_api_key_encrypted, shared_audience")
    .eq("id", id)
    .eq("owner_user_id", account.id)
    .maybeSingle();

  if (!partnership) return NextResponse.json({ error: "Partnership not found" }, { status: 404 });
  if (!partnership.partner_api_key_encrypted) {
    return NextResponse.json({ error: "Add the key your partner issued you before calling them." }, { status: 400 });
  }

  const partnerKey = decryptSecret(partnership.partner_api_key_encrypted);
  if (!partnerKey) return NextResponse.json({ error: "The stored partner key could not be read." }, { status: 500 });

  // Only hashes leave this instance — the partner never receives an address.
  const payload =
    action === "audience_share"
      ? {
          consentGiven: true,
          emailHashes: (emails ?? [])
            .filter((email) => typeof email === "string" && email.includes("@"))
            .slice(0, 500)
            .map((email) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex")),
        }
      : {};

  const result = await callPartner({
    partnerUrl: partnership.partner_platform_url,
    partnerKey,
    action: action ?? "ping",
    payload,
  });

  if (result.ok && (action ?? "ping") === "ping") {
    await supabase
      .from("platform_federation")
      .update({ status: "active", last_verified_at: new Date().toISOString() })
      .eq("id", partnership.id);
  }

  return NextResponse.json({ ok: result.ok, status: result.status, response: result.body });
}
