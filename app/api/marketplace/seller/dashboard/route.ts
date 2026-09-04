import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The signed-in user's own seller profile and listings, or 404 if not a seller. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("marketplace_seller_profiles")
    .select("*")
    .eq("user_id", account.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Not a seller yet." }, { status: 404 });
  }

  const { data: listings } = await supabase
    .from("marketplace_listings")
    .select("*")
    .eq("seller_id", account.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ profile, listings: listings ?? [] });
}
