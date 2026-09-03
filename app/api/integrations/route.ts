import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Lists connections. Tokens and keys are never returned to the browser. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await createServiceClient()
    .from("integrations")
    .select("id, provider, status, account_name, settings, last_error, connected_at, last_synced_at")
    .eq("user_id", account.id);

  return NextResponse.json({ integrations: data ?? [] });
}
