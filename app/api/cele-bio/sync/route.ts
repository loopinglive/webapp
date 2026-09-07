import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Lists which of the account's webinars are synced to Cele.bio. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: connection } = await supabase
    .from("cele_bio_connections")
    .select("id")
    .eq("user_id", account.id)
    .maybeSingle();

  if (!connection) return NextResponse.json({ synced: [] });

  const { data } = await supabase
    .from("cele_bio_synced_webinars")
    .select("webinar_id, cele_bio_product_id, synced_at")
    .eq("connection_id", connection.id);

  return NextResponse.json({ synced: data ?? [] });
}

const schema = z.object({ webinarId: z.string().uuid() });

/**
 * Marks a webinar as listed on the host's Cele.bio profile.
 *
 * There is no real Cele.bio API to push the listing to, so this only records
 * the intent — cele_bio_product_id stays null until a genuine sync job can
 * fill it in. Good enough to drive the "synced" badge in the UI without
 * pretending a network call happened that didn't.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "webinarId is required" }, { status: 422 });

  const supabase = createServiceClient();
  const { data: connection } = await supabase
    .from("cele_bio_connections")
    .select("id")
    .eq("user_id", account.id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "Connect Cele.bio first." }, { status: 422 });
  }

  const { error } = await supabase.from("cele_bio_synced_webinars").upsert(
    {
      connection_id: connection.id,
      webinar_id: parsed.data.webinarId,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "connection_id,webinar_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("cele_bio_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", connection.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: connection } = await supabase
    .from("cele_bio_connections")
    .select("id")
    .eq("user_id", account.id)
    .maybeSingle();

  if (!connection) return NextResponse.json({ ok: true });

  const { error } = await supabase
    .from("cele_bio_synced_webinars")
    .delete()
    .eq("connection_id", connection.id)
    .eq("webinar_id", webinarId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
