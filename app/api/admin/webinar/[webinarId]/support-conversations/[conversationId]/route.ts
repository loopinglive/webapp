import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";
import type { SupportConversationRow } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["open", "resolved", "escalated"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string; conversationId: string }> }
) {
  const { webinarId, conversationId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 422 });
  }

  const supabase = createServiceClient();

  // support_conversations has no webinar_id column -- confirm this
  // conversation's own registrant actually belongs to the webinar the caller
  // was just cleared for, so a URL with a mismatched conversationId can't
  // reach a conversation on someone else's webinar.
  const { data: conversationRow } = await supabase
    .from("support_conversations")
    .select("registrant_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversationRow) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  const { data: registrant } = await supabase
    .from("registrants")
    .select("id")
    .eq("id", conversationRow.registrant_id)
    .eq("webinar_id", webinarId)
    .maybeSingle();
  if (!registrant) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const patch: Partial<SupportConversationRow> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.status === "resolved") patch.resolved_at = new Date().toISOString();

  const { data: conversation, error } = await supabase
    .from("support_conversations")
    .update(patch)
    .eq("id", conversationId)
    .select("*")
    .single();

  if (error || !conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}
