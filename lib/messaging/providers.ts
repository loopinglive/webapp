import "server-only";

import { Resend } from "resend";
import twilio from "twilio";

export type Channel = "email" | "sms" | "whatsapp";

export type SendResult =
  | { ok: true; providerMessageId: string | null; raw: unknown }
  | { ok: false; error: string; retryable: boolean };

let resend: Resend | null = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

let twilioClient: ReturnType<typeof twilio> | null = null;
function getTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  twilioClient ??= twilio(sid, token);
  return twilioClient;
}

/** Which channels this deployment could actually send on right now. */
export function configuredChannels() {
  return {
    email: Boolean(process.env.RESEND_API_KEY),
    sms: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_SMS_FROM
    ),
    whatsapp: Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_WHATSAPP_FROM
    ),
  };
}

export async function sendEmail(input: {
  to: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const client = getResend();
  if (!client) {
    return { ok: false, error: "Email is not configured.", retryable: false };
  }

  try {
    const { data, error } = await client.emails.send({
      from: `${input.fromName} <${input.fromEmail}>`,
      to: input.to,
      replyTo: input.replyTo ?? undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      // A rejected sender or unverified domain will never succeed on retry.
      const permanent = /domain|from|forbidden|invalid/i.test(error.message);
      return { ok: false, error: error.message, retryable: !permanent };
    }

    return { ok: true, providerMessageId: data?.id ?? null, raw: data };
  } catch (caught) {
    return {
      ok: false,
      error: caught instanceof Error ? caught.message : "Email send failed",
      retryable: true,
    };
  }
}

async function sendTwilio(
  to: string,
  body: string,
  from: string
): Promise<SendResult> {
  const client = getTwilio();
  if (!client) {
    return { ok: false, error: "Twilio is not configured.", retryable: false };
  }

  try {
    const message = await client.messages.create({ body, from, to });
    return { ok: true, providerMessageId: message.sid, raw: { sid: message.sid } };
  } catch (caught) {
    const error = caught as { message?: string; status?: number };
    // 4xx from Twilio means the number or content is wrong; retrying will not
    // change that.
    const retryable = !error.status || error.status >= 500 || error.status === 429;
    return {
      ok: false,
      error: error.message ?? "Twilio send failed",
      retryable,
    };
  }
}

export function sendSms(input: { to: string; body: string }) {
  return sendTwilio(input.to, input.body, process.env.TWILIO_SMS_FROM ?? "");
}

export function sendWhatsApp(input: { to: string; body: string }) {
  const to = input.to.startsWith("whatsapp:") ? input.to : `whatsapp:${input.to}`;
  return sendTwilio(to, input.body, process.env.TWILIO_WHATSAPP_FROM ?? "");
}
