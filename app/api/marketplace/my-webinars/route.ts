import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The signed-in user's own webinars, for the "apply this to…" picker. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await createServiceClient()
    .from("webinars")
    .select("id, title")
    .eq("owner_id", account.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ webinars: data ?? [] });
}
