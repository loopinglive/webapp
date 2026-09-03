import "server-only";

import { JOIN_REMINDERS } from "@/lib/messaging/scheduler";
import {
  configuredChannels,
  sendEmail,
  sendSms,
  sendWhatsApp,
  type Channel,
} from "@/lib/messaging/providers";
import { composeEmail } from "@/lib/email/compose";
import { renderEmail } from "@/lib/email/render";
import { applyCompliance, resolveTemplate } from "@/lib/messaging/templates";
import { buildVariables } from "@/lib/messaging/variables";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

export const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;
const RETRY_AFTER_MS = 3600_000;

type Outcome = "sent" | "failed" | "cancelled" | "skipped";

/**
 * Sends one queued message, applying every rule that could have changed since
 * it was queued.
 *
 * The checks happen here rather than at queue time deliberately: someone can
 * buy, unsubscribe, or have a channel switched off in the days between a
 * reminder being scheduled and its moment arriving.
 */
export async function dispatchMessage(
  supabase: Client,
  messageId: string
): Promise<Outcome> {
  const { data: message } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (!message || message.status !== "pending") return "skipped";

  const channel = message.channel as Channel;
  const cancel = async (reason: string) => {
    await supabase
      .from("scheduled_messages")
      .update({ status: "cancelled", error_message: reason })
      .eq("id", messageId);
    return "cancelled" as const;
  };

  // 1. Has the host switched this channel off, or is it unconfigured here?
  const [{ data: settings }, available] = await Promise.all([
    supabase
      .from("automation_settings")
      .select("*")
      .eq("webinar_id", message.webinar_id)
      .maybeSingle(),
    Promise.resolve(configuredChannels()),
  ]);

  const enabled =
    channel === "email"
      ? (settings?.email_enabled ?? true)
      : channel === "sms"
        ? (settings?.sms_enabled ?? false)
        : (settings?.whatsapp_enabled ?? false);

  if (!enabled) return cancel(`${channel} is disabled for this webinar`);
  if (!available[channel]) return cancel(`${channel} is not configured`);

  // 2. Have they opted out of this channel?
  const { data: unsubscribed } = await supabase
    .from("unsubscribes")
    .select("id")
    .eq("registrant_id", message.registrant_id)
    .eq("webinar_id", message.webinar_id)
    .eq("channel", channel)
    .maybeSingle();

  if (unsubscribed) return cancel("Recipient unsubscribed");

  // 3. Have they bought since this was queued? Buyers get receipts, not pitches.
  const { data: registrant } = await supabase
    .from("registrants")
    .select("bought, attended, email, phone, full_name")
    .eq("id", message.registrant_id)
    .maybeSingle();

  if (!registrant) return cancel("Registrant no longer exists");

  if (registrant.bought && message.template_key !== "buyer_confirmation") {
    return cancel("Recipient has purchased");
  }

  // 4. Did they turn up after this reminder was queued?
  if (registrant.attended && JOIN_REMINDERS.includes(message.template_key ?? "")) {
    return cancel("Recipient already joined");
  }

  // 5. Resolve now, so the copy and the countdown are current.
  const variables = await buildVariables(supabase, {
    registrantId: message.registrant_id,
    webinarId: message.webinar_id,
    sessionId: message.session_id,
    channel,
  });

  const resolved = resolveTemplate(message.body, variables);
  const body = applyCompliance(channel, resolved, variables.unsubscribe_link);
  const subject = resolveTemplate(message.subject ?? "", variables);

  // A calendar entry is the single biggest lever on whether someone turns up,
  // so the confirmation and the day-before reminder both carry one.
  const CALENDAR_TEMPLATES = new Set([
    "registration_confirmation",
    "reminder_24h",
  ]);

  const calendarLinks =
    CALENDAR_TEMPLATES.has(message.template_key ?? "") && message.session_id
      ? [
          {
            label: "Add to calendar",
            url: `${SITE.url}/api/webinar/${message.webinar_id}/calendar?sessionId=${message.session_id}`,
          },
        ]
      : [];

  // Email carries its unsubscribe in the footer, so the HTML is built from the
  // resolved copy rather than the compliance-appended one — otherwise the link
  // appears twice, once as a bare URL in the body.
  const content = composeEmail({
    subject,
    body: resolved,
    variables,
    templateKey: message.template_key,
    brandName: settings?.from_name ?? "Loopinglive",
    unsubscribeLink: variables.unsubscribe_link,
  });

  const result =
    channel === "email"
      ? await sendEmail({
          to: registrant.email,
          fromName: settings?.from_name ?? "Loopinglive",
          fromEmail:
            process.env.RESEND_FROM_EMAIL?.trim() ||
            settings?.from_email ||
            "onboarding@resend.dev",
          replyTo: settings?.reply_to_email,
          subject: subject || "A message about your webinar",
          html: renderEmail({ ...content, secondaryLinks: calendarLinks }),
          text: body,
        })
      : channel === "sms"
        ? await sendSms({ to: registrant.phone, body })
        : await sendWhatsApp({ to: registrant.phone, body });

  const attempts = (message.attempts ?? 0) + 1;

  if (result.ok) {
    await supabase
      .from("scheduled_messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_message_id: result.providerMessageId,
        attempts,
        error_message: null,
      })
      .eq("id", messageId);

    await supabase.from("message_logs").insert({
      scheduled_message_id: messageId,
      registrant_id: message.registrant_id,
      channel,
      status: "sent",
      provider_response: { id: result.providerMessageId },
    });

    return "sent";
  }

  // A permanent failure, or one that has run out of attempts, stops here.
  const givingUp = !result.retryable || attempts >= MAX_ATTEMPTS;

  await supabase
    .from("scheduled_messages")
    .update({
      status: givingUp ? "failed_permanently" : "pending",
      attempts,
      error_message: result.error,
      // Back off an hour before trying again.
      scheduled_for: givingUp
        ? message.scheduled_for
        : new Date(Date.now() + RETRY_AFTER_MS).toISOString(),
    })
    .eq("id", messageId);

  await supabase.from("message_logs").insert({
    scheduled_message_id: messageId,
    registrant_id: message.registrant_id,
    channel,
    status: givingUp ? "failed_permanently" : "failed",
    provider_response: { error: result.error, attempts },
  });

  return "failed";
}

/** One pass of the outbox. */
export async function dispatchDue(supabase: Client, limit = BATCH_SIZE) {
  const { data: due } = await supabase
    .from("scheduled_messages")
    .select("id")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  const counts = { sent: 0, failed: 0, cancelled: 0, skipped: 0 };

  for (const message of due ?? []) {
    const outcome = await dispatchMessage(supabase, message.id);
    counts[outcome] += 1;
  }

  return counts;
}
