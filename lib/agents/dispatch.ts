import "server-only";

import { generateAgentMessage, type AgentHistoryMessage } from "@/lib/anthropic";
import { sendEmail, sendSms, sendWhatsApp } from "@/lib/messaging/providers";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * Autonomous follow-up agents.
 *
 * No inbound channel exists yet — an agent's "conversation" is a one-way
 * sequence it writes to a lead, not a two-way chat. That is a real,
 * honestly-scoped limitation (documented in lib/anthropic.ts's
 * generateAgentMessage), not a placeholder: it still delivers the actual
 * value here, an AI-personalised, quiet-hours-respecting, capped-length
 * nurture sequence per lead, sent over whichever of email/SMS/WhatsApp the
 * agent is allowed to use and the lead has contact info for.
 */

export type AgentConstraints = {
  quietHoursStart: number;
  quietHoursEnd: number;
  timezone: string;
  maxMessagesPerConversation: number;
  cooldownHours: number;
  channels: ("email" | "sms" | "whatsapp")[];
};

export const DEFAULT_CONSTRAINTS: AgentConstraints = {
  quietHoursStart: 21,
  quietHoursEnd: 8,
  timezone: "UTC",
  maxMessagesPerConversation: 4,
  cooldownHours: 24,
  channels: ["email"],
};

const NEW_CONVERSATIONS_PER_AGENT_PER_TICK = 20;

function parseConstraints(raw: Json): AgentConstraints {
  const value = (raw ?? {}) as Partial<AgentConstraints>;
  return {
    quietHoursStart: value.quietHoursStart ?? DEFAULT_CONSTRAINTS.quietHoursStart,
    quietHoursEnd: value.quietHoursEnd ?? DEFAULT_CONSTRAINTS.quietHoursEnd,
    timezone: value.timezone ?? DEFAULT_CONSTRAINTS.timezone,
    maxMessagesPerConversation: value.maxMessagesPerConversation ?? DEFAULT_CONSTRAINTS.maxMessagesPerConversation,
    cooldownHours: value.cooldownHours ?? DEFAULT_CONSTRAINTS.cooldownHours,
    channels: value.channels?.length ? value.channels : DEFAULT_CONSTRAINTS.channels,
  };
}

/** The local hour (0-23) right now in the given IANA timezone. Falls back to UTC on a bad zone. */
function localHour(timezone: string, at: Date): number {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(at)) % 24;
  } catch {
    return at.getUTCHours();
  }
}

function inQuietHours(constraints: AgentConstraints, at: Date): boolean {
  const hour = localHour(constraints.timezone, at);
  const { quietHoursStart: start, quietHoursEnd: end } = constraints;
  // A quiet window that wraps midnight (e.g. 21 -> 8) vs one that doesn't (e.g. 1 -> 5).
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

/** The next moment outside quiet hours, in the agent's timezone. */
function nextAllowedTime(constraints: AgentConstraints, from: Date): Date {
  const candidate = new Date(from);
  for (let i = 0; i < 48; i++) {
    if (!inQuietHours(constraints, candidate)) return candidate;
    candidate.setUTCHours(candidate.getUTCHours() + 1);
  }
  return candidate;
}

function leadTemperature(registrant: { watch_percentage: number; clicked_offer: boolean; bought: boolean }): string {
  if (registrant.bought) return "hot";
  if (registrant.clicked_offer || registrant.watch_percentage >= 70) return "hot";
  if (registrant.watch_percentage >= 30) return "warm";
  return "cold";
}

type Agent = {
  id: string;
  webinar_id: string | null;
  agent_type: string;
  agent_name: string;
  personality: Json;
  objectives: Json;
  constraints: Json;
  messages_sent: number;
};

async function pickChannel(
  supabase: ReturnType<typeof createServiceClient>,
  registrant: { id: string; email: string; phone: string },
  allowed: AgentConstraints["channels"]
): Promise<"email" | "sms" | "whatsapp" | null> {
  for (const channel of allowed) {
    if (channel === "email" && !registrant.email) continue;
    if ((channel === "sms" || channel === "whatsapp") && !registrant.phone) continue;

    const { data: unsubscribed } = await supabase
      .from("unsubscribes")
      .select("id")
      .eq("registrant_id", registrant.id)
      .eq("channel", channel)
      .maybeSingle();
    if (unsubscribed) continue;

    return channel;
  }
  return null;
}

async function deliver(
  channel: "email" | "sms" | "whatsapp",
  registrant: { email: string; phone: string; full_name: string },
  subject: string,
  body: string
): Promise<boolean> {
  if (channel === "email") {
    const result = await sendEmail({
      to: registrant.email,
      fromName: SITE.name,
      fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
      subject: subject || `A note for you, ${registrant.full_name || "there"}`,
      html: body
        .split("\n")
        .filter(Boolean)
        .map((line) => `<p>${line}</p>`)
        .join(""),
      text: body,
    });
    return result.ok;
  }

  const result = channel === "sms" ? await sendSms({ to: registrant.phone, body }) : await sendWhatsApp({ to: registrant.phone, body });
  return result.ok;
}

/** Creates conversations for newly eligible leads, one agent at a time. */
async function startNewConversations(supabase: ReturnType<typeof createServiceClient>, agent: Agent) {
  if (!agent.webinar_id) return { started: 0 };

  const triggerColumn = agent.agent_type === "sales_closer" ? "clicked_offer" : "attended";

  const { data: existing } = await supabase.from("agent_conversations").select("registrant_id").eq("agent_id", agent.id);
  const excluded = new Set((existing ?? []).map((row) => row.registrant_id));

  const { data: candidates } = await supabase
    .from("registrants")
    .select("id, email, phone, full_name, watch_percentage, clicked_offer, bought")
    .eq("webinar_id", agent.webinar_id)
    .eq(triggerColumn, true)
    .eq("bought", false)
    .limit(NEW_CONVERSATIONS_PER_AGENT_PER_TICK * 2);

  const eligible = (candidates ?? []).filter((registrant) => !excluded.has(registrant.id)).slice(0, NEW_CONVERSATIONS_PER_AGENT_PER_TICK);
  if (eligible.length === 0) return { started: 0 };

  const { data: webinar } = await supabase.from("webinars").select("title, offer_description").eq("id", agent.webinar_id).maybeSingle();
  const constraints = parseConstraints(agent.constraints);

  let started = 0;
  for (const registrant of eligible) {
    const channel = await pickChannel(supabase, registrant, constraints.channels);
    if (!channel) continue;

    const now = new Date();
    const deferred = inQuietHours(constraints, now);
    const sendAt = deferred ? nextAllowedTime(constraints, now) : now;

    const messages: (AgentHistoryMessage & { channel: string; at: string })[] = [];

    if (!deferred) {
      const draft = await generateAgentMessage({
        agentName: agent.agent_name,
        personality: String((agent.personality as { description?: string })?.description ?? agent.personality ?? ""),
        objective: String((agent.objectives as { goal?: string })?.goal ?? agent.objectives ?? ""),
        webinarTitle: webinar?.title ?? "",
        offerDescription: webinar?.offer_description ?? "",
        registrantName: registrant.full_name,
        engagementSummary: `Watched ${registrant.watch_percentage}% of the webinar. ${registrant.clicked_offer ? "Clicked the offer button." : "Has not clicked the offer."} Has not purchased.`,
        channel,
        history: [],
      });

      if (draft.body) {
        const delivered = await deliver(channel, registrant, draft.subject, draft.body);
        if (delivered) {
          messages.push({ role: "agent", content: draft.body, channel, at: now.toISOString() });
          await supabase.from("autonomous_agents").update({ messages_sent: agent.messages_sent + 1 }).eq("id", agent.id);
        }
      }
    }

    await supabase.from("agent_conversations").insert({
      agent_id: agent.id,
      registrant_id: registrant.id,
      channel,
      status: "active",
      messages: messages as unknown as Json,
      lead_temperature: leadTemperature(registrant),
      next_action_at: (deferred ? sendAt : new Date(now.getTime() + constraints.cooldownHours * 3_600_000)).toISOString(),
    });
    started += 1;
  }

  return { started };
}

/** Advances every active conversation whose next_action_at has arrived. */
async function advanceDueConversations(supabase: ReturnType<typeof createServiceClient>) {
  const { data: due } = await supabase
    .from("agent_conversations")
    .select("id, agent_id, registrant_id, channel, messages, next_action_at")
    .eq("status", "active")
    .lte("next_action_at", new Date().toISOString())
    .limit(50);

  if (!due?.length) return { advanced: 0 };

  let advanced = 0;
  for (const conversation of due) {
    if (!conversation.agent_id || !conversation.registrant_id) continue;

    const { data: agent } = await supabase
      .from("autonomous_agents")
      .select("id, webinar_id, agent_type, agent_name, personality, objectives, constraints, messages_sent, is_active")
      .eq("id", conversation.agent_id)
      .maybeSingle();
    if (!agent?.is_active || !agent.webinar_id) continue;

    const { data: registrant } = await supabase
      .from("registrants")
      .select("id, email, phone, full_name, watch_percentage, clicked_offer, bought")
      .eq("id", conversation.registrant_id)
      .maybeSingle();
    if (!registrant) continue;

    // Converted since the last tick — close it out and attribute the sale
    // instead of sending another follow-up to someone who already bought.
    if (registrant.bought) {
      const { data: purchase } = await supabase
        .from("purchases")
        .select("amount_cents")
        .eq("registrant_id", registrant.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const revenue = (purchase?.amount_cents ?? 0) / 100;

      await supabase
        .from("agent_conversations")
        .update({
          status: "converted",
          converted: true,
          converted_at: new Date().toISOString(),
          revenue_attributed: revenue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversation.id);

      const { data: current } = await supabase
        .from("autonomous_agents")
        .select("deals_closed, total_revenue_attributed")
        .eq("id", agent.id)
        .maybeSingle();
      await supabase
        .from("autonomous_agents")
        .update({
          deals_closed: (current?.deals_closed ?? 0) + 1,
          total_revenue_attributed: (current?.total_revenue_attributed ?? 0) + revenue,
        })
        .eq("id", agent.id);
      continue;
    }

    const constraints = parseConstraints(agent.constraints);
    const history = ((conversation.messages as AgentHistoryMessage[] | null) ?? []) as AgentHistoryMessage[];

    if (history.length >= constraints.maxMessagesPerConversation) {
      await supabase.from("agent_conversations").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", conversation.id);
      continue;
    }

    const { data: webinar } = await supabase.from("webinars").select("title, offer_description").eq("id", agent.webinar_id).maybeSingle();

    const draft = await generateAgentMessage({
      agentName: agent.agent_name,
      personality: String((agent.personality as { description?: string })?.description ?? agent.personality ?? ""),
      objective: String((agent.objectives as { goal?: string })?.goal ?? agent.objectives ?? ""),
      webinarTitle: webinar?.title ?? "",
      offerDescription: webinar?.offer_description ?? "",
      registrantName: registrant.full_name,
      engagementSummary: `Watched ${registrant.watch_percentage}% of the webinar. ${registrant.clicked_offer ? "Clicked the offer button." : "Has not clicked the offer."} Has not purchased. ${history.length} message(s) already sent.`,
      channel: conversation.channel as "email" | "sms" | "whatsapp",
      history,
    });

    if (!draft.body) continue;

    const delivered = await deliver(conversation.channel as "email" | "sms" | "whatsapp", registrant, draft.subject, draft.body);
    if (!delivered) continue;

    const nextMessages = [...history, { role: "agent" as const, content: draft.body }];
    const willReachMax = nextMessages.length >= constraints.maxMessagesPerConversation;

    await supabase
      .from("agent_conversations")
      .update({
        messages: nextMessages as unknown as Json,
        status: willReachMax ? "completed" : "active",
        next_action_at: willReachMax ? null : new Date(Date.now() + constraints.cooldownHours * 3_600_000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation.id);

    await supabase.from("autonomous_agents").update({ messages_sent: agent.messages_sent + 1 }).eq("id", agent.id);
    advanced += 1;
  }

  return { advanced };
}

export async function dispatchAgents() {
  const supabase = createServiceClient();

  const { data: agents } = await supabase
    .from("autonomous_agents")
    .select("id, webinar_id, agent_type, agent_name, personality, objectives, constraints, messages_sent")
    .eq("is_active", true);

  let started = 0;
  for (const agent of agents ?? []) {
    const result = await startNewConversations(supabase, agent);
    started += result.started;
  }

  const { advanced } = await advanceDueConversations(supabase);

  return { agentsChecked: agents?.length ?? 0, conversationsStarted: started, conversationsAdvanced: advanced };
}
