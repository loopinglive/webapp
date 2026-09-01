"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizonal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AiPersona, ChatMessage, PersonaModeMap } from "@/types";

type Props = {
  message: ChatMessage;
  sessionId: string;
  personas: AiPersona[];
  personaModes: PersonaModeMap;
  onClose: () => void;
  onSent: () => void;
};

export function AdminReplyBox({
  message,
  sessionId,
  personas,
  personaModes,
  onClose,
  onSent,
}: Props) {
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const selected = personas.find((persona) => persona.id === personaId);
  const selectedMode = selected ? (personaModes[selected.id] ?? "ai") : "ai";
  const preview =
    message.content.length > 30
      ? `${message.content.slice(0, 30)}…`
      : message.content;

  async function send() {
    if (!content.trim() || !personaId || sending) return;
    setSending(true);
    setError(null);

    const response = await fetch("/api/admin/manual-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalMessageId: message.id,
        sessionId,
        personaId,
        content,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not send that reply.");
      setSending(false);
      return;
    }

    setContent("");
    setSending(false);
    onSent();
  }

  return (
    <div className="ml-9 mt-2 rounded-xl border border-[#6C47FF]/30 bg-[#0F0F1A] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] text-[#A0A0B0]">
          Replying to{" "}
          <span className="font-semibold text-white">@{message.sender_name}</span>
          : <span className="italic">“{preview}”</span>
        </p>
        <button
          onClick={onClose}
          aria-label="Cancel reply"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Which persona speaks is never implicit — the admin sees the name and
          the mode before they send. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-[#A0A0B0]">Send as</span>
        {personas.map((persona) => {
          const active = persona.id === personaId;
          const mode = personaModes[persona.id] ?? "ai";
          return (
            <button
              key={persona.id}
              onClick={() => setPersonaId(persona.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors duration-200",
                active
                  ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                  : "border-[#1E1E2E] text-[#A0A0B0] hover:border-[#6C47FF]/40 hover:text-white"
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: mode === "ai" ? "#00C851" : "#FF9500" }}
              />
              {persona.persona_name}
            </button>
          );
        })}
      </div>

      {selected && selectedMode === "ai" && (
        <p className="mt-2 text-[10.5px] text-[#FF9500]">
          {selected.persona_name} is in AI mode — your reply goes out now, and the
          AI keeps answering other messages.
        </p>
      )}

      <div className="mt-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          rows={2}
          maxLength={500}
          placeholder={`Reply as ${selected?.persona_name ?? "persona"}…`}
          className="min-h-[52px] flex-1 resize-none rounded-lg border border-[#1E1E2E] bg-[#0A0A0F] px-3.5 py-2.5 text-[13px] text-white placeholder:text-[#A0A0B0]/60 focus:border-[#6C47FF] focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!content.trim() || sending}
          className={cn(
            "grid h-[52px] w-11 shrink-0 place-items-center rounded-lg transition-all duration-200",
            content.trim() && !sending
              ? "bg-[#6C47FF] text-white hover:bg-[#7C5AFF] active:scale-95"
              : "bg-[#1E1E2E] text-[#A0A0B0]/50"
          )}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
        </button>
      </div>

      {error && <p className="mt-2 text-[11.5px] text-[#FF3B3B]">{error}</p>}
    </div>
  );
}
