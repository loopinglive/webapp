import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { originalMessageId, sessionId, personaId, content } =
    (await request.json()) as {
      originalMessageId?: string;
      sessionId?: string;
      personaId?: string;
      content?: string;
    };

  const body = content?.trim();

  if (!originalMessageId || !sessionId || !personaId || !body) {
    return NextResponse.json({ error: "Missing reply details" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: persona } = await supabase
    .from("ai_personas")
    .select("id, persona_name, avatar_url")
    .eq("id", personaId)
    .maybeSingle();

  if (!persona) {
    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  }

  // Rule 5: admin replies post instantly — no artificial delay. To a viewer it
  // is indistinguishable from the persona's AI replies.
  const { data: inserted, error } = await supabase
    .from("live_chat_messages")
    .insert({
      session_id: sessionId,
      sender_name: persona.persona_name,
      sender_avatar: persona.avatar_url,
      is_fake: true,
      is_real_user: false,
      reply_to_message_id: originalMessageId,
      content: body,
      sent_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await Promise.all([
    supabase.from("ai_replies").insert({
      session_id: sessionId,
      original_message_id: originalMessageId,
      ai_persona_id: persona.id,
      persona_name: persona.persona_name,
      persona_avatar: persona.avatar_url,
      content: body,
      is_human_override: true,
    }),
    supabase
      .from("live_chat_messages")
      .update({
        has_ai_reply: true,
        ai_reply_pending: false,
        ai_reply_claimed_at: null,
      })
      .eq("id", originalMessageId),
  ]);

  return NextResponse.json({ success: true, message: inserted });
}
