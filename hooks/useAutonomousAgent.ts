"use client";

import { useCallback, useEffect, useState } from "react";

export type Agent = {
  id: string;
  agent_type: string;
  agent_name: string;
  personality: { description?: string };
  objectives: { goal?: string };
  constraints: {
    quietHoursStart: number;
    quietHoursEnd: number;
    timezone: string;
    maxMessagesPerConversation: number;
    cooldownHours: number;
    channels: string[];
  };
  is_active: boolean;
  messages_sent: number;
  deals_closed: number;
  total_revenue_attributed: number;
  created_at: string;
};

export type AgentConversation = {
  id: string;
  registrant_id: string;
  channel: string;
  status: string;
  messages: { role: "agent" | "lead"; content: string }[];
  lead_temperature: string;
  next_action_at: string | null;
  converted: boolean;
  revenue_attributed: number;
  created_at: string;
  registrants: { full_name: string; email: string } | null;
};

export function useAutonomousAgent(webinarId: string) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch(`/api/agents?webinarId=${webinarId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { agents: Agent[] };
      setAgents(payload.agents);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function createAgent(input: {
    agentType: string;
    agentName: string;
    personality: string;
    objective: string;
    channels: string[];
  }): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, ...input }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    await load();
    return { ok: true };
  }

  async function toggleAgent(id: string, isActive: boolean) {
    await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, webinarId, isActive }),
    });
    await load();
  }

  async function removeAgent(id: string) {
    await fetch("/api/agents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, webinarId }),
    });
    await load();
  }

  async function loadConversations(agentId: string): Promise<AgentConversation[]> {
    const response = await fetch(`/api/agents/${agentId}/conversations`, { cache: "no-store" });
    if (!response.ok) return [];
    const payload = (await response.json()) as { conversations: AgentConversation[] };
    return payload.conversations;
  }

  return { agents, loading, createAgent, toggleAgent, removeAgent, loadConversations, reload: load };
}
