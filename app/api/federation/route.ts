import { NextResponse } from "next/server";
import { z } from "zod";

import { federationConfigured, generateFederationKey } from "@/lib/federation/protocol";
import { encryptSecret } from "@/lib/white-label/crypto";
import { getUserAccount } from "@/lib/billing/account";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: partnerships } = await supabase
    .from("platform_federation")
    .select(
      "id, partner_platform_url, partnership_type, shared_audience, shared_analytics, cross_promotion_enabled, status, last_verified_at, partner_api_key_encrypted, created_at"
    )
    .eq("owner_user_id", account.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    configured: federationConfigured(),
    // The stored partner key is never returned — only whether one is set.
    partnerships: (partnerships ?? []).map(({ partner_api_key_encrypted, ...row }) => ({
      ...row,
      hasPartnerKey: Boolean(partner_api_key_encrypted),
    })),
  });
}

const createSchema = z.object({
  partnerPlatformUrl: z.string().url().max(300),
  partnershipType: z.enum(["cross_promotion", "audience_share", "full"]),
  sharedAudience: z.boolean().optional(),
  sharedAnalytics: z.boolean().optional(),
  crossPromotionEnabled: z.boolean().optional(),
  /** The key the partner issued us, if they have already sent one. */
  partnerApiKey: z.string().max(200).optional(),
});

/** Creates a partnership and issues the key the partner will call us with. Shown once, stored only as a hash. */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!federationConfigured()) {
    return NextResponse.json({ error: "Federation is not configured on this deployment." }, { status: 503 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const input = parsed.data;

  const { key, hash } = generateFederationKey();
  const supabase = createServiceClient();

  const { data: partnership, error } = await supabase
    .from("platform_federation")
    .insert({
      owner_user_id: account.id,
      host_platform_url: SITE.url,
      partner_platform_url: input.partnerPlatformUrl.replace(/\/$/, ""),
      partnership_type: input.partnershipType,
      shared_audience: input.sharedAudience ?? input.partnershipType !== "cross_promotion",
      shared_analytics: input.sharedAnalytics ?? input.partnershipType === "full",
      cross_promotion_enabled: input.crossPromotionEnabled ?? true,
      api_key_hash: hash,
      partner_api_key_encrypted: input.partnerApiKey ? encryptSecret(input.partnerApiKey) : null,
      status: "pending",
    })
    .select("id, partner_platform_url, partnership_type, status, created_at")
    .single();

  if (error || !partnership) {
    return NextResponse.json({ error: error?.message ?? "Could not create the partnership." }, { status: 500 });
  }

  // The only time this value exists outside the partner's hands.
  return NextResponse.json({ partnership, issuedKey: key });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  partnerApiKey: z.string().max(200).optional(),
  sharedAudience: z.boolean().optional(),
  sharedAnalytics: z.boolean().optional(),
  crossPromotionEnabled: z.boolean().optional(),
  status: z.enum(["pending", "active", "paused"]).optional(),
});

export async function PATCH(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const input = parsed.data;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("platform_federation")
    .update({
      ...(input.partnerApiKey !== undefined && { partner_api_key_encrypted: encryptSecret(input.partnerApiKey) }),
      ...(input.sharedAudience !== undefined && { shared_audience: input.sharedAudience }),
      ...(input.sharedAnalytics !== undefined && { shared_analytics: input.sharedAnalytics }),
      ...(input.crossPromotionEnabled !== undefined && { cross_promotion_enabled: input.crossPromotionEnabled }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .eq("id", input.id)
    .eq("owner_user_id", account.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServiceClient();
  await supabase.from("platform_federation").delete().eq("id", id).eq("owner_user_id", account.id);
  return NextResponse.json({ success: true });
}
