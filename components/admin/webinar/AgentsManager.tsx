"use client";

import { useState } from "react";
import { Bot, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";

import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { useAutonomousAgent, type Agent, type AgentConversation } from "@/hooks/useAutonomousAgent";

const AGENT_TYPES = [
  { value: "re_engagement", label: "Re-engagement", description: "Follows up with attendees who didn't buy." },
  { value: "sales_closer", label: "Sales closer", description: "Follows up with anyone who clicked the offer but didn't buy." },
] as const;

const CHANNELS = ["email", "sms", "whatsapp"] as const;

const TEMPERATURE_COLOUR: Record<string, string> = {
  hot: "text-[#FF6B6B]",
  warm: "text-[#F5A623]",
  cold: "text-ink-muted",
};

/**
 * Agents write, they don't yet listen — there is no inbound channel, so a
 * "conversation" is really a one-way, AI-personalised nurture sequence per
 * lead (see lib/agents/dispatch.ts for why). Still real: quiet hours,
 * per-lead message caps, and stopping automatically the moment someone buys.
 */
export function AgentsManager({ webinarId }: { webinarId: string }) {
  const { agents, loading, createAgent, toggleAgent, removeAgent, loadConversations } = useAutonomousAgent(webinarId);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  async function toggleExpand(agent: Agent) {
    if (expanded === agent.id) {
      setExpanded(null);
      return;
    }
    setExpanded(agent.id);
    setLoadingConversations(true);
    setConversations(await loadConversations(agent.id));
    setLoadingConversations(false);
  }

  return (
    <>
      <SectionHeader
        title="Follow-up Agents"
        description="An AI persona that automatically follows up with attendees who didn't buy — by email, SMS, or WhatsApp."
        action={
          <AdminButton variant="secondary" onClick={() => setCreating((value) => !value)}>
            <Plus className="h-3.5 w-3.5" />
            New agent
          </AdminButton>
        }
      />

      <div className="max-w-3xl space-y-5 px-6 py-8 lg:px-8">
        {creating && (
          <NewAgentForm
            onCancel={() => setCreating(false)}
            onCreate={async (input) => {
              const result = await createAgent(input);
              if (result.ok) setCreating(false);
              return result;
            }}
          />
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-[12.5px] text-ink-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : agents.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">No agents yet.</p>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-xl border border-hairline bg-surface">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <button onClick={() => void toggleExpand(agent)} className="flex flex-1 items-center gap-3 text-left">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-soft">
                      <Bot className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="flex items-center gap-2">
                        <span className="text-[13.5px] text-ink">{agent.agent_name}</span>
                        <span className="rounded-full border border-surface-3 px-2 py-0.5 text-[10px] text-ink-muted">
                          {AGENT_TYPES.find((type) => type.value === agent.agent_type)?.label ?? agent.agent_type}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-ink-faint">
                        {agent.messages_sent} sent · {agent.deals_closed} converted · ${agent.total_revenue_attributed.toFixed(0)} attributed
                      </span>
                    </span>
                    <ChevronDown className={`ml-auto h-4 w-4 text-ink-faint transition-transform ${expanded === agent.id ? "rotate-180" : ""}`} />
                  </button>
                  <div className="ml-3 flex items-center gap-1.5">
                    <button
                      onClick={() => void toggleAgent(agent.id, !agent.is_active)}
                      className={`h-7 rounded-full px-2.5 text-[11px] font-medium ${
                        agent.is_active ? "bg-[#00C851]/15 text-[#00C851]" : "bg-surface-3 text-ink-muted"
                      }`}
                    >
                      {agent.is_active ? "Active" : "Paused"}
                    </button>
                    <button
                      onClick={() => void removeAgent(agent.id)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-ink-muted hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {expanded === agent.id && (
                  <div className="border-t border-hairline px-4 py-3.5">
                    {loadingConversations ? (
                      <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
                    ) : conversations.length === 0 ? (
                      <p className="text-[12px] text-ink-faint">No conversations started yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {conversations.map((conversation) => (
                          <div key={conversation.id} className="rounded-lg border border-hairline bg-void px-3 py-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[12.5px] text-ink">
                                {conversation.registrants?.full_name || conversation.registrants?.email || "Unknown lead"}
                              </span>
                              <span className="flex items-center gap-2 text-[11px]">
                                <span className={TEMPERATURE_COLOUR[conversation.lead_temperature] ?? "text-ink-muted"}>
                                  {conversation.lead_temperature}
                                </span>
                                <span className="text-ink-faint">{conversation.status}</span>
                              </span>
                            </div>
                            {conversation.messages.length > 0 && (
                              <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-muted">
                                {conversation.messages[conversation.messages.length - 1].content}
                              </p>
                            )}
                            {conversation.converted && (
                              <p className="mt-1 text-[11px] text-[#00C851]">
                                Converted — ${conversation.revenue_attributed.toFixed(0)} attributed
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function NewAgentForm({
  onCreate,
  onCancel,
}: {
  onCreate: (input: {
    agentType: string;
    agentName: string;
    personality: string;
    objective: string;
    channels: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [agentType, setAgentType] = useState<(typeof AGENT_TYPES)[number]["value"]>("re_engagement");
  const [agentName, setAgentName] = useState("");
  const [personality, setPersonality] = useState("");
  const [objective, setObjective] = useState("");
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    const result = await onCreate({ agentType, agentName, personality, objective, channels });
    setSaving(false);
    if (!result.ok) setError(result.error ?? "Could not create the agent.");
  }

  return (
    <div className="space-y-4 rounded-xl border border-hairline bg-surface p-4">
      <div>
        <span className="text-[12.5px] text-ink-muted">Type</span>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {AGENT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setAgentType(type.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                agentType === type.value ? "border-accent bg-accent/10" : "border-hairline hover:border-surface-3"
              }`}
            >
              <span className="block text-[12.5px] font-medium text-ink">{type.label}</span>
              <span className="mt-0.5 block text-[11px] text-ink-faint">{type.description}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Agent name">
        <TextInput value={agentName} onChange={(event) => setAgentName(event.target.value)} placeholder="Alex from the team" />
      </Field>

      <Field label="Personality" hint="How it should sound — tone, style, what it should and shouldn't say.">
        <TextArea
          value={personality}
          onChange={(event) => setPersonality(event.target.value)}
          rows={3}
          placeholder="Warm and direct, like a helpful colleague. Never pushy. Uses short sentences."
        />
      </Field>

      <Field label="Objective">
        <TextArea
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          rows={2}
          placeholder="Answer objections and get them to book a call before the offer closes."
        />
      </Field>

      <div>
        <span className="text-[12.5px] text-ink-muted">Channels</span>
        <div className="mt-1.5 flex gap-1.5">
          {CHANNELS.map((channel) => (
            <button
              key={channel}
              onClick={() =>
                setChannels((current) => (current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel]))
              }
              className={`h-8 rounded-full px-3 text-[12px] uppercase transition-colors ${
                channels.includes(channel) ? "bg-accent text-white" : "border border-hairline text-ink-muted"
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}

      <div className="flex gap-2">
        <AdminButton
          onClick={() => void submit()}
          disabled={saving || !agentName.trim() || personality.trim().length < 10 || objective.trim().length < 10 || channels.length === 0}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create agent
        </AdminButton>
        <AdminButton variant="ghost" onClick={onCancel}>
          Cancel
        </AdminButton>
      </div>
    </div>
  );
}
