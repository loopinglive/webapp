import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The signed-in user's own scripts, newest first. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await createServiceClient()
    .from("webinar_scripts")
    .select("id, title, topic, webinar_length_minutes, status, webinar_id, created_at, updated_at")
    .eq("user_id", account.id)
    .order("updated_at", { ascending: false });

  return NextResponse.json({ scripts: data ?? [] });
}
