import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { generatePersonaReply, humanReplyDelayMs } from "@/lib/anthropic";
import { createServiceClient } from "@/lib/supabase/server";
import type { AiPersona } from "@/types";

export const dynamic = "force-dynamic";
// Generation plus the 2–8s human delay.
export const maxDuration = 60;

const HISTORY_SIZE = 20;
/** A claim older than this is treated as abandoned and can be retaken. */
const CLAIM_TIMEOUT_MS = 30_000;

/**
 * Stable 0–99 from a message id.
 *
 * The reply percentage has to be decided from the message itself, not from
 * Math.random() in each viewer's browser. With 200 viewers rolling
 * independently at 50%, something like 1 - 0.5^200 of comments would get a
 * reply — the setting would mean nothing. Hashing the id makes every caller
 * reach the same verdict.
 */
function rollFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

export async function POST(request: Request) {
  const { messageId, sessionId, webinarId } = (await request.json()) as {
    messageId?: string;
    sessionId?: string;
    webinarId?: string;
  };

  if (!messageId || !sessionId || !webinarId) {
    return NextResponse.json(
      { error: "messageId, sessionId and webinarId are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: message, error: lookupError } = await supabase
    .from("live_chat_messages")
    .select("*")
    .eq("id", messageId)
    .eq("session_id", sessionId)
    .maybeSingle();

  // Separate "no such message" from "the database is unreachable" — the queue
  // should retry the second and give up on the first.
  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 503 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // A reply is itself inserted as is_fake, so without this guard the personas
  // would answer each other forever, one Claude call at a time.
  if (message.reply_to_message_id) {
    return NextResponse.json({ skipped: "reply" });
  }
  if (message.has_ai_reply) {
    return NextResponse.json({ skipped: "already-answered" });
  }

  const { data: personaRows } = await supabase
    .from("ai_personas")
    .select("*")
    .eq("webinar_id", webinarId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const personas = (personaRows ?? []) as AiPersona[];
  if (!personas.length) {
    return NextResponse.json({ skipped: "no-personas" });
  }

  // Real users are never ignored. Persona chatter is sampled.
  if (message.is_real_user) {
    if (!personas.some((persona) => persona.reply_to_real_users)) {
      return NextResponse.json({ skipped: "real-user-replies-off" });
    }
  } else if (message.is_fake) {
    const percentage = personas[0].fake_comment_reply_percentage ?? 50;
    if (rollFor(message.id) >= percentage) {
      return NextResponse.json({ skipped: "sampled-out" });
    }
  } else {
    return NextResponse.json({ skipped: "not-repliable" });
  }

  // Rule 4: alternate. Whoever spoke last does not go again.
  const { data: lastReply } = await supabase
    .from("ai_replies")
    .select("ai_persona_id")
    .eq("session_id", sessionId)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const persona =
    personas.find((candidate) => candidate.id !== lastReply?.ai_persona_id) ??
    personas[0];

  const { data: mode } = await supabase
    .from("persona_mode")
    .select("mode")
    .eq("session_id", sessionId)
    .eq("ai_persona_id", persona.id)
    .maybeSingle();

  // Human mode: the admin owns this persona's voice. Leave the message
  // unanswered so it surfaces in the admin's Unanswered filter.
  if (mode?.mode === "human") {
    await supabase
      .from("live_chat_messages")
      .update({ ai_reply_pending: false, ai_reply_claimed_at: null })
      .eq("id", messageId);
    return NextResponse.json({ skipped: "human-mode", persona: persona.persona_name });
  }

  // Atomic claim. Every viewer's browser fires this route for the same message;
  // the UPDATE takes a row lock, so exactly one caller gets a row back and goes
  // on to spend a Claude call. A claim left behind by a killed function becomes
  // retakeable after CLAIM_TIMEOUT_MS.
  const staleBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS).toISOString();
  const { data: claimed } = await supabase
    .from("live_chat_messages")
    .update({ ai_reply_pending: true, ai_reply_claimed_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("has_ai_reply", false)
    .or(`ai_reply_pending.eq.false,ai_reply_claimed_at.lt.${staleBefore}`)
    .select("id");

  if (!claimed?.length) {
    return NextResponse.json({ skipped: "already-claimed" });
  }

  const [{ data: webinar }, { data: history }, { data: ownReplies }] =
    await Promise.all([
      supabase
        .from("webinars")
        .select("title, description")
        .eq("id", webinarId)
        .maybeSingle(),
      supabase
        .from("live_chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("sent_at", { ascending: false })
        .limit(HISTORY_SIZE),
      supabase
        .from("ai_replies")
        .select("content")
        .eq("session_id", sessionId)
        .eq("ai_persona_id", persona.id)
        .order("sent_at", { ascending: false })
        .limit(5),
    ]);

  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("starts_at")
    .eq("id", sessionId)
    .maybeSingle();

  const videoPosition = session
    ? Math.max(0, (Date.now() - new Date(session.starts_at).getTime()) / 1000)
    : 0;

  let content: string | null = null;

  try {
    content = await generatePersonaReply({
      persona,
      webinarTitle: webinar?.title ?? "this webinar",
      webinarTopic: webinar?.description ?? webinar?.title ?? "this webinar",
      offerDescription:
        webinar?.description ?? "the offer the host presents during the session",
      videoPosition,
      history: (history ?? []).slice().reverse(),
      target: message,
      ownRecentReplies: (ownReplies ?? []).map((row) => row.content),
    });
  } catch (error) {
    // Release the claim so the queue can retry this message.
    await supabase
      .from("live_chat_messages")
      .update({ ai_reply_pending: false, ai_reply_claimed_at: null })
      .eq("id", messageId);

    const status =
      error instanceof Anthropic.RateLimitError
        ? 429
        : error instanceof Anthropic.APIError
          ? error.status
          : 500;

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reply failed" },
      { status: status ?? 500 }
    );
  }

  if (!content) {
    await supabase
      .from("live_chat_messages")
      .update({ ai_reply_pending: false, ai_reply_claimed_at: null })
      .eq("id", messageId);
    return NextResponse.json({ skipped: "empty-reply" });
  }

  // Rule 3: a reply that lands instantly reads as a bot.
  await new Promise((resolve) => setTimeout(resolve, humanReplyDelayMs()));

  const { data: inserted, error: insertError } = await supabase
    .from("live_chat_messages")
    .insert({
      session_id: sessionId,
      sender_name: persona.persona_name,
      sender_avatar: persona.avatar_url,
      is_fake: true,
      is_real_user: false,
      reply_to_message_id: messageId,
      content,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    await supabase
      .from("live_chat_messages")
      .update({ ai_reply_pending: false, ai_reply_claimed_at: null })
      .eq("id", messageId);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await Promise.all([
    supabase.from("ai_replies").insert({
      session_id: sessionId,
      original_message_id: messageId,
      ai_persona_id: persona.id,
      persona_name: persona.persona_name,
      persona_avatar: persona.avatar_url,
      content,
      is_human_override: false,
    }),
    supabase
      .from("live_chat_messages")
      .update({
        has_ai_reply: true,
        ai_reply_pending: false,
        ai_reply_claimed_at: null,
      })
      .eq("id", messageId),
  ]);

  return NextResponse.json({
    success: true,
    replyId: inserted.id,
    persona: persona.persona_name,
    reply: content,
  });
}
