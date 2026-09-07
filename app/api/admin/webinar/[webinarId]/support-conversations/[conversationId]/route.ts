import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { SupportConversationRow } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["open", "resolved", "escalated"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { conversationId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 422 });
  }

  const patch: Partial<SupportConversationRow> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.status === "resolved") patch.resolved_at = new Date().toISOString();

  const supabase = createServiceClient();
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
