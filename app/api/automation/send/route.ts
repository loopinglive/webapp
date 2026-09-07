import { NextResponse } from "next/server";

import { dispatchMessage } from "@/lib/messaging/dispatch";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Sends one queued message immediately, applying all the usual send-time guards. */
export async function POST(request: Request) {
  const { scheduledMessageId } = (await request.json()) as {
    scheduledMessageId?: string;
  };

  if (!scheduledMessageId) {
    return NextResponse.json(
      { error: "scheduledMessageId is required" },
      { status: 400 }
    );
  }

  const secret = process.env.CRON_SECRET;
  const isCron = Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`
  );

  const supabase = createServiceClient();

  if (!isCron) {
    const { data: message } = await supabase
      .from("scheduled_messages")
      .select("webinar_id")
      .eq("id", scheduledMessageId)
      .maybeSingle();

    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const access = await requireWebinarAccess(message.webinar_id);
    if (!access.ok) return access.response;
  }

  const outcome = await dispatchMessage(supabase, scheduledMessageId);

  return NextResponse.json({ success: outcome === "sent", outcome });
}
