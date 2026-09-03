import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { provider } = (await request.json()) as { provider?: string };
  if (!provider) {
    return NextResponse.json({ error: "A provider is required." }, { status: 400 });
  }

  // Deleted rather than flagged: leaving a revoked credential at rest serves
  // no purpose once the host has disconnected it.
  const { error } = await createServiceClient()
    .from("integrations")
    .delete()
    .eq("user_id", account.id)
    .eq("provider", provider);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
