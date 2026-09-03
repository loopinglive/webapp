import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Enrols the signed-in user, reusing the referral code they already have. */
export async function POST() {
  const account = await getUserAccount();
  if (!account) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("affiliates")
    .select("id")
    .eq("user_id", account.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ success: true, alreadyJoined: true });

  const { error } = await supabase.from("affiliates").insert({
    user_id: account.id,
    referral_code: account.referral_code,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
