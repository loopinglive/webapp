import { NextResponse } from "next/server";
import { z } from "zod";

import { DEFAULT_CONSTRAINTS } from "@/lib/agents/dispatch";
import { requireWebinarAccess } from "@/lib/webinar-access";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

const AGENT_TYPES = ["re_engagement", "sales_closer"] as const;

export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data: agents } = await supabase
    .from("autonomous_agents")
    .select("id, agent_type, agent_name, personality, objectives, constraints, is_active, messages_sent, deals_closed, total_revenue_attributed, created_at")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ agents: agents ?? [] });
}

const createSchema = z.object({
  webinarId: z.string().uuid(),
  agentType: z.enum(AGENT_TYPES),
  agentName: z.string().min(2).max(60),
  personality: z.string().min(10).max(600),
  objective: z.string().min(10).max(400),
  channels: z.array(z.enum(["email", "sms", "whatsapp"])).min(1).max(3),
  quietHoursStart: z.number().int().min(0).max(23).optional(),
  quietHoursEnd: z.number().int().min(0).max(23).optional(),
  timezone: z.string().max(60).optional(),
  maxMessagesPerConversation: z.number().int().min(1).max(10).optional(),
  cooldownHours: z.number().int().min(1).max(168).optional(),
});

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const input = parsed.data;

  const access = await requireWebinarAccess(input.webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data: agent, error } = await supabase
    .from("autonomous_agents")
    .insert({
      user_id: access.account?.id ?? null,
      webinar_id: input.webinarId,
      agent_type: input.agentType,
      agent_name: input.agentName,
      personality: { description: input.personality } as Json,
      objectives: { goal: input.objective } as Json,
      constraints: {
        quietHoursStart: input.quietHoursStart ?? DEFAULT_CONSTRAINTS.quietHoursStart,
        quietHoursEnd: input.quietHoursEnd ?? DEFAULT_CONSTRAINTS.quietHoursEnd,
        timezone: input.timezone ?? DEFAULT_CONSTRAINTS.timezone,
        maxMessagesPerConversation: input.maxMessagesPerConversation ?? DEFAULT_CONSTRAINTS.maxMessagesPerConversation,
        cooldownHours: input.cooldownHours ?? DEFAULT_CONSTRAINTS.cooldownHours,
        channels: input.channels,
      } as Json,
    })
    .select("id, agent_type, agent_name, personality, objectives, constraints, is_active, messages_sent, deals_closed, total_revenue_attributed, created_at")
    .single();

  if (error || !agent) return NextResponse.json({ error: error?.message ?? "Could not create the agent." }, { status: 500 });
  return NextResponse.json({ agent });
}

export async function PATCH(request: Request) {
  const { id, webinarId, isActive } = (await request.json().catch(() => ({}))) as {
    id?: string;
    webinarId?: string;
    isActive?: boolean;
  };
  if (!id || !webinarId || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "id, webinarId and isActive are required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { error } = await supabase.from("autonomous_agents").update({ is_active: isActive }).eq("id", id).eq("webinar_id", webinarId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { id, webinarId } = (await request.json().catch(() => ({}))) as { id?: string; webinarId?: string };
  if (!id || !webinarId) return NextResponse.json({ error: "id and webinarId are required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { error } = await supabase.from("autonomous_agents").delete().eq("id", id).eq("webinar_id", webinarId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
