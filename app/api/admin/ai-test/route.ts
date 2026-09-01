import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { generatePersonaReply } from "@/lib/anthropic";
import { createServiceClient } from "@/lib/supabase/server";
import type { AiPersona, ChatMessage } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Dry run of a moderator, using the same prompt builder the live room uses.
 *
 * Nothing is written to a session — this exists so the host can hear the voice
 * before an audience does.
 */
export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId, persona, message, videoPosition } =
    (await request.json()) as {
      webinarId?: string;
      /** Unsaved draft from the form, so the host can test before saving. */
      persona?: {
        personaName?: string;
        personalityBrief?: string;
        fakeCommentReplyPercentage?: number;
      };
      message?: string;
      videoPosition?: number;
    };

  if (!webinarId || !persona?.personaName || !persona.personalityBrief) {
    return NextResponse.json(
      { error: "A persona name and brief are required." },
      { status: 400 }
    );
  }
  if (!message?.trim()) {
    return NextResponse.json({ error: "Type a message to test." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, topic, description, offer_description, key_talking_points")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  const draft: AiPersona = {
    id: "preview",
    webinar_id: webinarId,
    persona_name: persona.personaName,
    avatar_url: null,
    personality_brief: persona.personalityBrief,
    reply_to_real_users: true,
    fake_comment_reply_percentage: persona.fakeCommentReplyPercentage ?? 50,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const target = {
    id: "preview-message",
    session_id: "preview",
    sender_name: "You",
    content: message.trim(),
    sent_at: new Date().toISOString(),
  } as ChatMessage;

  const startedAt = Date.now();

  try {
    const reply = await generatePersonaReply({
      persona: draft,
      webinarTitle: webinar.title,
      webinarTopic:
        webinar.topic ?? webinar.description ?? webinar.title,
      offerDescription:
        webinar.offer_description ??
        webinar.key_talking_points ??
        "the offer the host presents during the session",
      videoPosition: videoPosition ?? 0,
      history: [],
      target,
      ownRecentReplies: [],
    });

    return NextResponse.json({
      reply,
      persona: draft.persona_name,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const status =
      error instanceof Anthropic.APIError ? (error.status ?? 500) : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status }
    );
  }
}
