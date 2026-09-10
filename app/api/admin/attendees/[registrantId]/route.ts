import { NextResponse } from "next/server";

import { deriveSegments } from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";
import type { AttendeeProfilePayload, ChatMessage } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ registrantId: string }> }
) {
  const { registrantId } = await params;
  const supabase = createServiceClient();

  const { data: attendee } = await supabase
    .from("registrants")
    .select("*")
    .eq("id", registrantId)
    .maybeSingle();

  if (!attendee) {
    return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
  }

  const access = await requireWebinarAccess(attendee.webinar_id);
  if (!access.ok) return access.response;

  const [
    { data: source },
    { data: events },
    { data: messages },
    { data: segmentRow },
    { data: webinar },
  ] = await Promise.all([
    supabase
      .from("attendee_sources")
      .select("*")
      .eq("registrant_id", registrantId)
      .maybeSingle(),
    supabase
      .from("attendee_events")
      .select("*")
      .eq("registrant_id", registrantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("live_chat_messages")
      .select("*")
      .eq("registrant_id", registrantId)
      .order("sent_at", { ascending: false }),
    supabase
      .from("attendee_segments")
      .select("segment")
      .eq("registrant_id", registrantId)
      .maybeSingle(),
    supabase
      .from("webinars")
      .select("title, video_duration_seconds")
      .eq("id", attendee.webinar_id)
      .maybeSingle(),
  ]);

  // Attach whatever the moderators said back to each message.
  const sent = (messages ?? []) as ChatMessage[];
  const { data: replyRows } = sent.length
    ? await supabase
        .from("live_chat_messages")
        .select("*")
        .in(
          "reply_to_message_id",
          sent.map((message) => message.id)
        )
        .order("sent_at", { ascending: true })
    : { data: [] };

  const repliesBy = new Map<string, ChatMessage[]>();
  for (const reply of (replyRows ?? []) as ChatMessage[]) {
    if (!reply.reply_to_message_id) continue;
    const bucket = repliesBy.get(reply.reply_to_message_id) ?? [];
    bucket.push(reply);
    repliesBy.set(reply.reply_to_message_id, bucket);
  }

  const payload: AttendeeProfilePayload = {
    attendee,
    // The cached row is used when present, but a miss falls back to the
    // derived value rather than to "REGISTERED" — an unprocessed registrant
    // is not a registered one, and this profile sat beside stat tiles that
    // had already worked that out.
    segment:
      segmentRow?.segment ??
      (await deriveSegments(supabase, attendee.webinar_id)).get(registrantId) ??
      "REGISTERED",
    source: source ?? null,
    events: events ?? [],
    messages: sent.map((message) => ({
      ...message,
      replies: repliesBy.get(message.id) ?? [],
    })),
    webinarTitle: webinar?.title ?? "",
    videoDurationSeconds: webinar?.video_duration_seconds ?? null,
  };

  return NextResponse.json(payload);
}
