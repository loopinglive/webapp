import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";
import type { MarketplaceListingRow } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Listings awaiting review.
 *
 * `is_approved` starts false on every new listing and nothing else flips it —
 * without this queue, a marketplace listing would just sit invisible forever.
 */
export async function GET(request: Request) {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const supabase = createServiceClient();

  let query = supabase
    .from("marketplace_listings")
    .select("*")
    .order("created_at", { ascending: false });

  query =
    status === "pending"
      ? query.eq("is_approved", false)
      : query.eq("is_approved", true);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}

const schema = z.object({
  listingId: z.string().uuid(),
  action: z.enum(["approve", "reject", "feature", "unfeature"]),
});

export async function POST(request: Request) {
  const { account, response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const patch: Partial<MarketplaceListingRow> =
    parsed.data.action === "approve"
      ? { is_approved: true }
      : parsed.data.action === "reject"
        ? { is_approved: false, is_active: false }
        : parsed.data.action === "feature"
          ? { is_featured: true }
          : { is_featured: false };

  const { error } = await supabase
    .from("marketplace_listings")
    .update(patch)
    .eq("id", parsed.data.listingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("admin_actions").insert({
    admin_id: account.id,
    action: `marketplace_listing_${parsed.data.action}`,
    detail: { listingId: parsed.data.listingId } as never,
  });

  return NextResponse.json({ success: true });
}
