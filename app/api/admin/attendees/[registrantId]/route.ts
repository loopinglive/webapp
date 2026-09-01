import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { AttendeeProfilePayload, ChatMessage } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ registrantId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

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
    segment: segmentRow?.segment ?? "REGISTERED",
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
