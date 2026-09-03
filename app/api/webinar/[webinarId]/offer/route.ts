import { NextResponse } from "next/server";

import { syncContactInBackground } from "@/lib/integrations/sync";
import { dispatchWebhookInBackground } from "@/lib/webhooks/dispatch";

import { logEvent, syncSegment } from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The offer the room should reveal, and when.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("webinar_offers")
    .select("*")
    .eq("webinar_id", webinarId)
    .eq("is_active", true)
    .order("trigger_video_offset_seconds", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ offer: data ?? null });
}

// Click tracking. Feeds the "Clicked Offer" segment and the admin's per-attendee
// profile.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const { registrantId } = (await request.json()) as { registrantId?: string };

  if (!registrantId) {
    return NextResponse.json({ error: "registrantId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: before } = await supabase
    .from("registrants")
    .select("clicked_offer, session_id, full_name, email, phone")
    .eq("id", registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  const { error } = await supabase
    .from("registrants")
    .update({
      clicked_offer: true,
      // First click is the one that counts — reopening the offer later should
      // not rewrite when they became a lead.
      ...(before?.clicked_offer
        ? {}
        : { offer_clicked_at: new Date().toISOString() }),
    })
    .eq("id", registrantId)
    .eq("webinar_id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fires on the first click only, so a host's Zapier does not receive one
  // event per time someone reopens the modal.
  if (!before?.clicked_offer) {
    await logEvent(supabase, {
      registrantId,
      sessionId: before?.session_id ?? null,
      type: "clicked_offer",
    });

    const { data: webinar } = await supabase
      .from("webinars")
      .select("owner_id, title")
      .eq("id", webinarId)
      .maybeSingle();

    const { data: offer } = await supabase
      .from("webinar_offers")
      .select("offer_title")
      .eq("webinar_id", webinarId)
      .eq("is_active", true)
      .maybeSingle();

    dispatchWebhookInBackground(webinar?.owner_id ?? null, "registrant.clicked_offer", {
      registrantId,
      name: before?.full_name ?? "",
      email: before?.email ?? "",
      offerTitle: offer?.offer_title ?? null,
      clickedAt: new Date().toISOString(),
    });

    syncContactInBackground(
      webinar?.owner_id ?? null,
      "registrant.clicked_offer",
      {
        email: before?.email ?? "",
        full_name: before?.full_name ?? null,
        phone: before?.phone ?? null,
      },
      webinar?.title ?? ""
    );
  }

  await syncSegment(supabase, registrantId);

  return NextResponse.json({ ok: true });
}
