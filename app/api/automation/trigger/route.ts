import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import {
  cancelJoinReminders,
  handlePurchase,
  schedulePostWebinarMessages,
  scheduleRegistrationMessages,
} from "@/lib/messaging/scheduler";
import { generateSessionReplays } from "@/lib/replay";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Event = "registration" | "joined" | "session_ended" | "purchased";

/**
 * Turns something that happened into messages that will happen.
 *
 * Called internally by the routes that own each event, and by pg_cron when a
 * session ends. Guarded so it cannot be driven from the open internet.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const internal = request.headers.get("x-automation-secret") === secret;
  const authorised =
    (secret && internal) ||
    request.headers.get("authorization") === `Bearer ${secret}` ||
    Boolean(await getAdminUser());

  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { event, registrantId, sessionId, webinarId } =
    (await request.json()) as {
      event?: Event;
      registrantId?: string;
      sessionId?: string | null;
      webinarId?: string;
    };

  const supabase = createServiceClient();

  switch (event) {
    case "registration": {
      if (!registrantId || !webinarId) return bad();
      const scheduled = await scheduleRegistrationMessages(supabase, {
        webinarId,
        registrantId,
        sessionId: sessionId ?? null,
      });
      return NextResponse.json({ success: true, scheduled });
    }

    case "joined": {
      if (!registrantId) return bad();
      await cancelJoinReminders(supabase, {
        registrantId,
        sessionId: sessionId ?? null,
      });
      return NextResponse.json({ success: true });
    }

    case "session_ended": {
      if (!sessionId) return bad();
      // Replay links first — the follow-up emails reference them.
      const replays = await generateSessionReplays(supabase, sessionId);
      const scheduled = await schedulePostWebinarMessages(supabase, sessionId);
      return NextResponse.json({ success: true, scheduled, replays });
    }

    case "purchased": {
      if (!registrantId || !webinarId) return bad();
      const scheduled = await handlePurchase(supabase, {
        webinarId,
        registrantId,
        sessionId: sessionId ?? null,
      });
      return NextResponse.json({ success: true, scheduled });
    }

    default:
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }
}

const bad = () =>
  NextResponse.json({ error: "Missing identifiers for this event" }, { status: 400 });
