import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { SITE } from "@/lib/constants";
import { sendEmail } from "@/lib/messaging/providers";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends the upsell email to anyone who finished a webinar with an active
 * upsell sequence, once their sequence's delay has actually passed.
 *
 * Deliberately its own small pipeline rather than reusing scheduled_messages
 * / dispatchMessage: those are keyed to a fixed template_key vocabulary and a
 * per-webinar automation_settings row, neither of which fits a message that
 * is configured per sequence and whose "webinar" context is really a pair of
 * webinars (the one they just watched, and the one being offered).
 *
 * Runs on the same accepted-callers pattern as the other cron routes: a
 * signed-in admin, or a bearer CRON_SECRET for an external scheduler.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorised =
    (secret && request.headers.get("authorization") === `Bearer ${secret}`) ||
    Boolean(await getAdminUser());

  if (!authorised) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: pending, error } = await supabase
    .from("registrants")
    .select("id, email, full_name, webinar_id, upsell_source_webinar_id, upsell_webinar_id, upsell_eligible_at")
    .eq("upsell_eligible", true)
    .is("upsell_sent_at", null)
    .not("upsell_eligible_at", "is", null)
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending?.length) return NextResponse.json({ sent: 0, skipped: 0 });

  let sent = 0;
  let skipped = 0;

  for (const registrant of pending) {
    if (!registrant.upsell_source_webinar_id || !registrant.upsell_webinar_id) {
      skipped += 1;
      continue;
    }

    const { data: sequence } = await supabase
      .from("upsell_sequences")
      .select("delay_days, email_subject, email_body, is_active, target_webinar_id")
      .eq("source_webinar_id", registrant.upsell_source_webinar_id)
      .eq("target_webinar_id", registrant.upsell_webinar_id)
      .maybeSingle();

    if (!sequence?.is_active) {
      skipped += 1;
      continue;
    }

    const dueAt = new Date(registrant.upsell_eligible_at as string);
    dueAt.setDate(dueAt.getDate() + sequence.delay_days);
    if (dueAt.getTime() > Date.now()) {
      skipped += 1;
      continue;
    }

    const { data: unsubscribed } = await supabase
      .from("unsubscribes")
      .select("id")
      .eq("registrant_id", registrant.id)
      .eq("channel", "email")
      .maybeSingle();

    if (unsubscribed) {
      await supabase.from("registrants").update({ upsell_sent_at: new Date().toISOString() }).eq("id", registrant.id);
      skipped += 1;
      continue;
    }

    const { data: target } = await supabase
      .from("webinars")
      .select("title")
      .eq("id", sequence.target_webinar_id)
      .maybeSingle();

    const registerUrl = `${SITE.url}/webinar/${sequence.target_webinar_id}/register`;
    const subject = sequence.email_subject || `You might like this too: ${target?.title ?? "our next webinar"}`;
    const body =
      sequence.email_body ||
      `Hi ${registrant.full_name || "there"},\n\nSince you watched our last webinar, we thought you'd want to know about "${target?.title ?? "our next session"}".\n\nSave your seat: ${registerUrl}`;

    const result = await sendEmail({
      to: registrant.email,
      fromName: SITE.name,
      fromEmail: `hello@${new URL(SITE.url).hostname}`,
      subject,
      html: `${body
        .split("\n")
        .filter(Boolean)
        .map((line) => `<p>${line}</p>`)
        .join("")}<p><a href="${registerUrl}">${registerUrl}</a></p>`,
      text: `${body}\n\n${registerUrl}`,
    });

    if (result.ok) {
      sent += 1;
      await supabase.from("registrants").update({ upsell_sent_at: new Date().toISOString() }).eq("id", registrant.id);
    } else {
      skipped += 1;
    }
  }

  return NextResponse.json({ sent, skipped });
}
