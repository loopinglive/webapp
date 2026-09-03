import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "A key is required." }, { status: 400 });

  // Scoped by user_id so one account cannot revoke another's key.
  const { error } = await createServiceClient()
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", account.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
