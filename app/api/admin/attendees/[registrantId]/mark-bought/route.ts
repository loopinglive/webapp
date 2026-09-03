import { NextResponse } from "next/server";

import { syncContactInBackground } from "@/lib/integrations/sync";
import { dispatchWebhookInBackground } from "@/lib/webhooks/dispatch";

import { requireAdmin } from "@/lib/admin-auth";
import { logEvent, syncSegment } from "@/lib/attendee-tracking";
import { handlePurchase } from "@/lib/messaging/scheduler";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The one segment an admin sets by hand — for offers sold on an external page,
// where nothing tells us automatically.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ registrantId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { registrantId } = await params;
  // Optional: an admin marking an external sale can attach what it was worth.
  // Without an amount the purchase is still recorded, just unpriced.
  const { amountCents, currency } = (await request
    .json()
    .catch(() => ({}))) as { amountCents?: number; currency?: string };

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("registrants")
    .update({ bought: true, bought_at: now, manually_marked_bought: true })
    .eq("id", registrantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logEvent(supabase, {
    registrantId,
    type: "bought",
    data: { manual: true },
  });

  const segment = await syncSegment(supabase, registrantId);

  // Buyers leave every sequence and get a receipt instead.
  const { data: row } = await supabase
    .from("registrants")
    .select("webinar_id, session_id, full_name, email, phone")
    .eq("id", registrantId)
    .maybeSingle();

  if (row) {
    const { data: webinar } = await supabase
      .from("webinars")
      .select("owner_id, title")
      .eq("id", row.webinar_id)
      .maybeSingle();

    const { data: activeOffer } = await supabase
      .from("webinar_offers")
      .select("offer_title")
      .eq("webinar_id", row.webinar_id)
      .eq("is_active", true)
      .maybeSingle();

    dispatchWebhookInBackground(webinar?.owner_id ?? null, "registrant.bought", {
      registrantId,
      name: row.full_name,
      email: row.email,
      offerTitle: activeOffer?.offer_title ?? null,
      boughtAt: now,
      isManual: true,
    });

    syncContactInBackground(
      webinar?.owner_id ?? null,
      "registrant.bought",
      { email: row.email, full_name: row.full_name, phone: row.phone },
      webinar?.title ?? ""
    );

    // Revenue lives in the ledger, not on the boolean. Falls back to the
    // offer's configured price when the admin did not name an amount.
    const { data: offer } = await supabase
      .from("webinar_offers")
      .select("id, price_cents, currency")
      .eq("webinar_id", row.webinar_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    await supabase.from("purchases").upsert(
      {
        webinar_id: row.webinar_id,
        session_id: row.session_id,
        registrant_id: registrantId,
        offer_id: offer?.id ?? null,
        amount_cents: Math.max(
          0,
          Math.round(amountCents ?? offer?.price_cents ?? 0)
        ),
        currency: currency ?? offer?.currency ?? "USD",
        source: "manual",
      },
      { onConflict: "registrant_id,offer_id", ignoreDuplicates: false }
    );

    await handlePurchase(supabase, {
      webinarId: row.webinar_id,
      registrantId,
      sessionId: row.session_id,
    });
  }

  return NextResponse.json({ success: true, segment });
}
