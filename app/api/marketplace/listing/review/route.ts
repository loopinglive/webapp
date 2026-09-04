import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  listingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).trim().optional(),
  body: z.string().max(2000).trim().optional(),
});

/** Only a verified purchaser can review — the constraint the table name promises. */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "A rating from 1 to 5 is required." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: purchase } = await supabase
    .from("marketplace_purchases")
    .select("id")
    .eq("listing_id", parsed.data.listingId)
    .eq("buyer_id", account.id)
    .maybeSingle();

  if (!purchase) {
    return NextResponse.json(
      { error: "Only buyers who have purchased this can review it." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("marketplace_reviews").upsert(
    {
      listing_id: parsed.data.listingId,
      reviewer_id: account.id,
      purchase_id: purchase.id,
      rating: parsed.data.rating,
      title: parsed.data.title || null,
      body: parsed.data.body || null,
    },
    { onConflict: "listing_id,reviewer_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.rpc("recalculate_listing_rating", { p_listing_id: parsed.data.listingId });

  return NextResponse.json({ success: true });
}
