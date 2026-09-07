import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

/** Pending GDPR requests for one webinar, for the host to triage. */
export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("gdpr_requests")
    .select("id, requester_email, request_type, status, notes, created_at, processed_at")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

const schema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["access", "erasure", "marketing_objection", "reject"]),
});

/**
 * Actions a pending GDPR request against the matching registrant.
 *
 * "access" hands back the same export the attendee data panel already
 * produces; "erasure" calls the same erase_registrant function that panel
 * uses; "marketing_objection" suppresses future messages without deleting
 * anything else. "reject" is for when no registrant matches this email on
 * this webinar — it still has to be marked done, just without an action to
 * take.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "requestId and action are required." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: gdprRequest } = await supabase
    .from("gdpr_requests")
    .select("id, webinar_id, requester_email, request_type, status")
    .eq("id", parsed.data.requestId)
    .maybeSingle();

  if (!gdprRequest || !gdprRequest.webinar_id) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const access = await requireWebinarAccess(gdprRequest.webinar_id);
  if (!access.ok) return access.response;

  if (gdprRequest.status === "completed") {
    return NextResponse.json({ error: "This request has already been processed." }, { status: 400 });
  }

  const { data: registrant } = await supabase
    .from("registrants")
    .select("id, email")
    .eq("webinar_id", gdprRequest.webinar_id)
    .ilike("email", gdprRequest.requester_email)
    .maybeSingle();

  let notes = "";
  let exportPayload: unknown = null;

  if (parsed.data.action === "reject") {
    notes = "No matching registrant found on this webinar.";
  } else if (!registrant) {
    notes = "No matching registrant found on this webinar — could not action.";
  } else if (parsed.data.action === "access") {
    const { data } = await supabase.rpc("export_registrant_data", { p_registrant_id: registrant.id });
    exportPayload = data;
    notes = "Data export generated.";
  } else if (parsed.data.action === "erasure") {
    const { data } = await supabase.rpc("erase_registrant", { p_registrant_id: registrant.id });
    notes = `Erased. ${JSON.stringify(data)}`;
  } else if (parsed.data.action === "marketing_objection") {
    await supabase.from("unsubscribes").upsert(
      { registrant_id: registrant.id, webinar_id: gdprRequest.webinar_id, channel: "email" },
      { onConflict: "registrant_id,webinar_id,channel" }
    );
    notes = "Unsubscribed from email.";
  }

  await supabase
    .from("gdpr_requests")
    .update({
      status: "completed",
      processed_by: access.actorId,
      processed_at: new Date().toISOString(),
      notes,
    })
    .eq("id", gdprRequest.id);

  await logAudit({
    action: `gdpr.${parsed.data.action === "erasure" ? "deletion_completed" : "request_processed"}`,
    resourceType: "gdpr_request",
    resourceId: gdprRequest.id,
    userId: access.isPlatformAdmin ? null : access.actorId,
    newValue: { action: parsed.data.action, webinarId: gdprRequest.webinar_id },
    request,
  });

  return NextResponse.json({ success: true, notes, export: exportPayload });
}
