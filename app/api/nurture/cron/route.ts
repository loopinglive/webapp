import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import type { Touchpoint } from "@/lib/nurture/predict";
import { sendEmail, sendSms, sendWhatsApp } from "@/lib/messaging/providers";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Sends any touchpoint whose scheduled moment has arrived.
 *
 * "Arrived" means: the activation date plus the touchpoint's day offset has
 * passed, and the current UTC hour has reached the hour this lead actually
 * engages at. Running every two hours means a touchpoint lands in the right
 * part of that lead's day rather than whenever the batch happened to run.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorised =
    (secret && request.headers.get("authorization") === `Bearer ${secret}`) || Boolean(await getAdminUser());
  if (!authorised) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: sequences } = await supabase
    .from("predictive_nurture_sequences")
    .select("id, webinar_id, registrant_id, touchpoints, status, messages_sent, created_at, converted")
    .eq("status", "active")
    .eq("converted", false)
    .limit(200);

  if (!sequences?.length) return NextResponse.json({ sent: 0, completed: 0 });

  const now = new Date();
  let sent = 0;
  let completed = 0;

  for (const sequence of sequences) {
    if (!sequence.registrant_id) continue;

    const { data: registrant } = await supabase
      .from("registrants")
      .select("id, email, phone, full_name, bought")
      .eq("id", sequence.registrant_id)
      .maybeSingle();
    if (!registrant) continue;

    // Bought since activation — stop nurturing a customer.
    if (registrant.bought) {
      await supabase
        .from("predictive_nurture_sequences")
        .update({ status: "completed", converted: true })
        .eq("id", sequence.id);
      completed += 1;
      continue;
    }

    const touchpoints = ((sequence.touchpoints as Touchpoint[] | null) ?? []).slice();
    const activatedAt = new Date(sequence.created_at).getTime();

    const dueIndex = touchpoints.findIndex((touchpoint) => {
      if (touchpoint.sentAt) return false;
      const dueDay = activatedAt + touchpoint.dayOffset * 86_400_000;
      if (now.getTime() < dueDay) return false;
      // Same day: wait for their hour. A later day: overdue, send now.
      const sameDay = now.getTime() - dueDay < 86_400_000;
      return sameDay ? now.getUTCHours() >= touchpoint.hour : true;
    });

    if (dueIndex === -1) {
      if (touchpoints.length > 0 && touchpoints.every((touchpoint) => touchpoint.sentAt)) {
        await supabase.from("predictive_nurture_sequences").update({ status: "completed" }).eq("id", sequence.id);
        completed += 1;
      }
      continue;
    }

    const touchpoint = touchpoints[dueIndex];

    const { data: unsubscribed } = await supabase
      .from("unsubscribes")
      .select("id")
      .eq("registrant_id", registrant.id)
      .eq("channel", touchpoint.channel)
      .maybeSingle();

    if (unsubscribed) {
      await supabase.from("predictive_nurture_sequences").update({ status: "completed" }).eq("id", sequence.id);
      completed += 1;
      continue;
    }

    let delivered = false;
    if (touchpoint.channel === "email" && registrant.email) {
      const result = await sendEmail({
        to: registrant.email,
        fromName: SITE.name,
        fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
        subject: touchpoint.subject,
        html: touchpoint.body
          .split("\n")
          .filter(Boolean)
          .map((line) => `<p>${line}</p>`)
          .join(""),
        text: touchpoint.body,
      });
      delivered = result.ok;
    } else if (registrant.phone) {
      const result =
        touchpoint.channel === "sms"
          ? await sendSms({ to: registrant.phone, body: touchpoint.body })
          : await sendWhatsApp({ to: registrant.phone, body: touchpoint.body });
      delivered = result.ok;
    }

    if (!delivered) continue;

    touchpoints[dueIndex] = { ...touchpoint, sentAt: now.toISOString() };
    const allSent = touchpoints.every((row) => row.sentAt);

    await supabase
      .from("predictive_nurture_sequences")
      .update({
        touchpoints: touchpoints as unknown as Json,
        messages_sent: (sequence.messages_sent ?? 0) + 1,
        last_message_sent_at: now.toISOString(),
        ...(allSent ? { status: "completed" } : {}),
      })
      .eq("id", sequence.id);

    sent += 1;
    if (allSent) completed += 1;
  }

  return NextResponse.json({ sent, completed });
}

export const POST = GET;
