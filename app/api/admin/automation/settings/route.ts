import { NextResponse } from "next/server";

import { getSettings } from "@/lib/messaging/scheduler";
import { configuredChannels } from "@/lib/messaging/providers";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

const FIELDS = [
  "email_enabled",
  "sms_enabled",
  "whatsapp_enabled",
  "replay_enabled",
  "replay_duration_hours",
  "re_engagement_enabled",
  "re_engagement_delay_days",
  "re_engagement_frequency_days",
  "max_re_engagement_messages",
  "unsubscribe_enabled",
  "from_name",
  "from_email",
  "reply_to_email",
  "sms_sender_id",
] as const;

export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const settings = await getSettings(supabase, webinarId);

  const [{ count: sent }, { count: failed }, { count: unsubscribed }] =
    await Promise.all([
      supabase
        .from("scheduled_messages")
        .select("id", { count: "exact", head: true })
        .eq("webinar_id", webinarId)
        .eq("status", "sent"),
      supabase
        .from("scheduled_messages")
        .select("id", { count: "exact", head: true })
        .eq("webinar_id", webinarId)
        .in("status", ["failed", "failed_permanently"]),
      supabase
        .from("unsubscribes")
        .select("id", { count: "exact", head: true })
        .eq("webinar_id", webinarId),
    ]);

  return NextResponse.json({
    settings,
    // What this deployment can physically send, regardless of the toggles.
    available: configuredChannels(),
    stats: {
      sent: sent ?? 0,
      failed: failed ?? 0,
      unsubscribed: unsubscribed ?? 0,
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown> & {
    webinarId?: string;
  };

  if (!body.webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(body.webinarId);
  if (!access.ok) return access.response;

  const patch: Record<string, unknown> = {
    webinar_id: body.webinarId,
    updated_at: new Date().toISOString(),
  };

  for (const field of FIELDS) {
    if (field in body) patch[field] = body[field];
  }

  const email = patch.from_email;
  if (typeof email === "string" && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "That from address does not look like an email." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("automation_settings")
    .upsert(patch as never, { onConflict: "webinar_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, settings: data });
}
