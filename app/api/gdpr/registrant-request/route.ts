import { NextResponse } from "next/server";
import { z } from "zod";

import { SITE } from "@/lib/constants";
import { sendEmail } from "@/lib/messaging/providers";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REQUEST_TYPES = ["access", "erasure", "marketing_objection"] as const;

const schema = z.object({
  webinarId: z.string().uuid(),
  requesterEmail: z.string().email(),
  requestType: z.enum(REQUEST_TYPES),
});

const LABELS: Record<(typeof REQUEST_TYPES)[number], string> = {
  access: "see the data we hold about them",
  erasure: "have their data deleted",
  marketing_objection: "stop receiving marketing messages",
};

/**
 * Where a registrant's GDPR request starts.
 *
 * Loopinglive is the processor here, not the controller — the host who ran
 * the webinar is, so the request goes to them to action, same as the Phase 14
 * GDPR rules require. Requires a webinarId because an email address alone
 * cannot say which host's data it concerns; the intended path here is a link
 * from that webinar's confirmation or reminder email.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email, webinar and request type are required." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, owner_id")
    .eq("id", parsed.data.webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "That webinar could not be found." }, { status: 404 });
  }

  const { data: created, error } = await supabase
    .from("gdpr_requests")
    .insert({
      requester_email: parsed.data.requesterEmail,
      request_type: parsed.data.requestType,
      webinar_id: webinar.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (webinar.owner_id) {
    const { data: owner } = await supabase
      .from("user_accounts")
      .select("email")
      .eq("id", webinar.owner_id)
      .maybeSingle();

    if (owner?.email) {
      await sendEmail({
        to: owner.email,
        fromName: SITE.name,
        fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
        subject: `A data request for ${webinar.title}`,
        html: `<p>${parsed.data.requesterEmail} has asked to ${LABELS[parsed.data.requestType]} for "${webinar.title}".</p><p>Loopinglive processes this data on your instruction — as the host, you are the data controller and this request is yours to action within 30 days.</p><p><a href="${SITE.url}/admin/webinar/${webinar.id}/gdpr-requests">Review and process this request</a></p>`,
        text: `${parsed.data.requesterEmail} has asked to ${LABELS[parsed.data.requestType]} for "${webinar.title}". Review it at ${SITE.url}/admin/webinar/${webinar.id}/gdpr-requests`,
      }).catch(() => {
        // The request is recorded either way — email is a courtesy, not the record of truth.
      });
    }
  }

  return NextResponse.json({
    requestId: created.id,
    message: "Your request has been sent to the host. They will respond within 30 days.",
  });
}
