import { NextResponse } from "next/server";

import { requireWebinarAccess } from "@/lib/webinar-access";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const supabase = createServiceClient();

  const { data: agent } = await supabase.from("autonomous_agents").select("webinar_id").eq("id", agentId).maybeSingle();
  if (!agent?.webinar_id) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const access = await requireWebinarAccess(agent.webinar_id);
  if (!access.ok) return access.response;

  const { data: conversations } = await supabase
    .from("agent_conversations")
    .select(
      "id, registrant_id, channel, status, messages, lead_temperature, next_action_at, converted, revenue_attributed, created_at, registrants(full_name, email)"
    )
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ conversations: conversations ?? [] });
}
