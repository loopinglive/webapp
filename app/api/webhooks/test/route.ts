import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Sends a representative payload to one endpoint, and waits for the result. */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "An endpoint is required." }, { status: 400 });

  const supabase = createServiceClient();

  const { data: endpoint } = await supabase
    .from("webhook_endpoints")
    .select("id")
    .eq("id", id)
    .eq("user_id", account.id)
    .maybeSingle();

  if (!endpoint) return NextResponse.json({ error: "No such endpoint." }, { status: 404 });

  await dispatchWebhook(account.id, "registrant.created", {
    registrantId: "00000000-0000-0000-0000-000000000000",
    name: "Sarah Okonkwo",
    email: "sarah@example.com",
    phone: "+447700900123",
    country: "GB",
    webinarId: "00000000-0000-0000-0000-000000000000",
    webinarTitle: "The 3-Offer Framework",
    sessionId: "00000000-0000-0000-0000-000000000000",
    registeredAt: new Date().toISOString(),
    source: "test",
    test: true,
  });

  const { data: log } = await supabase
    .from("webhook_logs")
    .select("status, response_status, response_body, error_message")
    .eq("webhook_endpoint_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ result: log });
}
