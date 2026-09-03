import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Lists the caller's keys. key_hash is never selected. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await createServiceClient()
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, expires_at, is_active, created_at")
    .eq("user_id", account.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}
