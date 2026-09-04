import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  displayName: z.string().min(2).max(80).trim(),
  bio: z.string().max(2000).trim().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

/**
 * Becomes a seller.
 *
 * `payout_enabled` stays false here — that only flips once Stripe Connect
 * onboarding actually completes, which this route does not do. Selling and
 * being paid out are two different steps on purpose, so a listing can be
 * created and reviewed before a payout method exists.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "A display name is required." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: profile, error } = await supabase
    .from("marketplace_seller_profiles")
    .upsert(
      {
        user_id: account.id,
        display_name: parsed.data.displayName,
        bio: parsed.data.bio || null,
        website_url: parsed.data.websiteUrl || null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("user_accounts")
    .update({ is_marketplace_seller: true, marketplace_seller_id: profile.id })
    .eq("id", account.id);

  return NextResponse.json({ profile });
}
