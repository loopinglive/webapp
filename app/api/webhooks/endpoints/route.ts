import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/dispatch";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  // HTTPS only: a signed payload sent over plaintext is still readable.
  url: z.string().url().startsWith("https://").max(500),
  events: z.array(z.enum(WEBHOOK_EVENTS)).default([]),
  description: z.string().max(200).trim().optional(),
});

export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, url, description, secret, events, is_active, created_at")
    .eq("user_id", account.id)
    .order("created_at", { ascending: false });

  const ids = (endpoints ?? []).map((e) => e.id);
  const { data: logs } = ids.length
    ? await supabase
        .from("webhook_logs")
        .select("id, webhook_endpoint_id, event_type, status, response_status, attempt_count, error_message, created_at, sent_at")
        .in("webhook_endpoint_id", ids)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };

  return NextResponse.json({ endpoints: endpoints ?? [], logs: logs ?? [] });
}

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "The URL must be https:// and valid.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { data, error } = await createServiceClient()
    .from("webhook_endpoints")
    .insert({
      user_id: account.id,
      url: parsed.data.url,
      events: parsed.data.events,
      description: parsed.data.description ?? null,
    })
    .select("id, url, description, secret, events, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ endpoint: data });
}

export async function DELETE(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "An endpoint is required." }, { status: 400 });

  await createServiceClient()
    .from("webhook_endpoints")
    .delete()
    .eq("id", id)
    .eq("user_id", account.id);

  return NextResponse.json({ success: true });
}
