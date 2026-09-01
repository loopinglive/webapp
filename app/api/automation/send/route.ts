import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { dispatchMessage } from "@/lib/messaging/dispatch";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Sends one queued message immediately, applying all the usual send-time guards. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorised =
    (secret && request.headers.get("authorization") === `Bearer ${secret}`) ||
    Boolean(await getAdminUser());

  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scheduledMessageId } = (await request.json()) as {
    scheduledMessageId?: string;
  };

  if (!scheduledMessageId) {
    return NextResponse.json(
      { error: "scheduledMessageId is required" },
      { status: 400 }
    );
  }

  const outcome = await dispatchMessage(
    createServiceClient(),
    scheduledMessageId
  );

  return NextResponse.json({ success: outcome === "sent", outcome });
}
