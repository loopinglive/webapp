import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import {
  configuredChannels,
  sendEmail,
  sendSms,
  sendWhatsApp,
  type Channel,
} from "@/lib/messaging/providers";
import { composeEmail } from "@/lib/email/compose";
import { renderEmail } from "@/lib/email/render";
import {
  applyCompliance,
  EXAMPLE_VARIABLES,
  resolveTemplate,
} from "@/lib/messaging/templates";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Sends one template to the admin, filled with example data.
 *
 * Never touches a real registrant — a test send that used a live attendee's
 * details could reach them by mistake, and would put their data in a message
 * they never asked for.
 */
export async function POST(request: Request) {
  const { user, response: denied } = await requireAdmin();
  if (denied) return denied;

  const { templateId, recipientPhone } = (await request.json()) as {
    templateId?: string;
    recipientPhone?: string;
  };

  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: template } = await supabase
    .from("message_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const channel = template.channel as Channel;

  if (!configuredChannels()[channel]) {
    return NextResponse.json(
      { error: `${channel} is not configured on this deployment.` },
      { status: 400 }
    );
  }

  const { data: settings } = await supabase
    .from("automation_settings")
    .select("from_name, from_email, reply_to_email")
    .eq("webinar_id", template.webinar_id)
    .maybeSingle();

  const variables = { ...EXAMPLE_VARIABLES };
  const resolved = resolveTemplate(template.body, variables);
  const body = applyCompliance(channel, resolved, variables.unsubscribe_link);
  const subject = `[Test] ${resolveTemplate(template.subject ?? "", variables)}`;

  if (channel === "email") {
    if (!user.email) {
      return NextResponse.json(
        { error: "Your admin account has no email address." },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to: user.email,
      fromName: settings?.from_name ?? "Loopinglive",
      fromEmail:
        process.env.RESEND_FROM_EMAIL?.trim() ||
        settings?.from_email ||
        "onboarding@resend.dev",
      replyTo: settings?.reply_to_email,
      subject,
      html: renderEmail(
        composeEmail({
          subject: resolveTemplate(template.subject ?? "", variables),
          body: resolved,
          variables,
          templateKey: template.template_key,
          brandName: settings?.from_name ?? "Loopinglive",
          unsubscribeLink: variables.unsubscribe_link,
        })
      ),
      text: body,
    });

    return result.ok
      ? NextResponse.json({ success: true, sentTo: user.email })
      : NextResponse.json({ error: result.error }, { status: 502 });
  }

  if (!recipientPhone) {
    return NextResponse.json(
      { error: "Enter a phone number to send a test to." },
      { status: 400 }
    );
  }

  const result =
    channel === "sms"
      ? await sendSms({ to: recipientPhone, body })
      : await sendWhatsApp({ to: recipientPhone, body });

  return result.ok
    ? NextResponse.json({ success: true, sentTo: recipientPhone })
    : NextResponse.json({ error: result.error }, { status: 502 });
}
