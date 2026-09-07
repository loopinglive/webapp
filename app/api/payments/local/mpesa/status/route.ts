import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Polled by the "check your phone" screen — M-Pesa has no redirect to land on. */
export async function GET(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const checkoutRequestId = new URL(request.url).searchParams.get("checkoutRequestId");
  if (!checkoutRequestId) {
    return NextResponse.json({ error: "checkoutRequestId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("local_payment_intents")
    .select("status, user_id")
    .eq("provider", "mpesa")
    .eq("provider_reference", checkoutRequestId)
    .maybeSingle();

  if (!data || data.user_id !== account.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ status: data.status });
}
