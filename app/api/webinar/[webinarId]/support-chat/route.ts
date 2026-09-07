import { NextResponse } from "next/server";
import { z } from "zod";

import { clientIp, LIMITS, rateLimit, tooManyRequests } from "@/lib/ratelimit";
import { generateSupportReply, type SupportChatMessage } from "@/lib/anthropic";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({
  registrantId: z.string().uuid(),
  sessionId: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(500).trim(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const limit = rateLimit(`support-chat:${parsed.data.registrantId}:${clientIp(request)}`, LIMITS.supportChat);
  if (!limit.ok) return tooManyRequests(limit);

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, topic, offer_description, key_talking_points, objection_notes")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found." }, { status: 404 });
  }

  const { data: registrant } = await supabase
    .from("registrants")
    .select("id")
    .eq("id", parsed.data.registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!registrant) {
    return NextResponse.json({ error: "Registrant not found." }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("support_conversations")
    .select("id, messages")
    .eq("registrant_id", parsed.data.registrantId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const history = ((existing?.messages as unknown as SupportChatMessage[]) ?? []).slice(-12);

  const { reply, shouldEscalate } = await generateSupportReply({
    webinarTitle: webinar.title,
    topic: webinar.topic ?? webinar.title,
    offerDescription: webinar.offer_description ?? "",
    keyTalkingPoints: webinar.key_talking_points ?? "",
    objectionNotes: webinar.objection_notes ?? "",
    history,
    question: parsed.data.message,
  });

  const nextMessages: SupportChatMessage[] = [
    ...history,
    { role: "attendee", content: parsed.data.message },
    { role: "assistant", content: reply },
  ];

  const status = shouldEscalate ? "escalated" : "open";

  if (existing) {
    await supabase
      .from("support_conversations")
      .update({
        messages: nextMessages as unknown as Json,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("support_conversations").insert({
      registrant_id: parsed.data.registrantId,
      session_id: parsed.data.sessionId ?? null,
      channel: "webinar_chat",
      status,
      messages: nextMessages as unknown as Json,
    });
  }

  return NextResponse.json({ reply, escalated: shouldEscalate });
}
