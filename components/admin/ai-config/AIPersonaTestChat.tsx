"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

import { AdminButton, TextInput } from "@/components/admin/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

type Draft = {
  personaName: string;
  personalityBrief: string;
  fakeCommentReplyPercentage: number;
};

type Exchange = {
  question: string;
  persona: string;
  reply: string;
  elapsedMs: number;
};

/**
 * Runs the real prompt against the real model, using the unsaved form values,
 * so the host can hear the voice before an audience does.
 */
export function AIPersonaTestChat({
  webinarId,
  drafts,
}: {
  webinarId: string;
  drafts: Draft[];
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function test(index: number) {
    const persona = drafts[index];
    if (!message.trim() || !persona?.personaName || !persona.personalityBrief) {
      setError("Give this moderator a name and a brief first.");
      return;
    }

    setBusy(index);
    setError(null);

    const response = await fetch("/api/admin/ai-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, persona, message }),
    });

    setBusy(null);

    const payload = (await response.json()) as {
      reply?: string;
      persona?: string;
      elapsedMs?: number;
      error?: string;
    };

    if (!response.ok || !payload.reply) {
      setError(payload.error ?? "That test did not come back.");
      return;
    }

    setHistory((current) => [
      {
        question: message,
        persona: payload.persona ?? persona.personaName,
        reply: payload.reply!,
        elapsedMs: payload.elapsedMs ?? 0,
      },
      ...current,
    ]);
  }

  return (
    <section className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
      <h2 className="text-[13px] font-semibold text-white">Test your moderators</h2>
      <p className="mt-1 text-[12px] text-[#A0A0B0]">
        Type what an attendee might say, then hear how each one answers.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TextInput
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="does this work for a service business?"
          className="min-w-[200px] flex-1"
        />
        {drafts.map((draft, index) => (
          <AdminButton
            key={index}
            variant={index === 0 ? "primary" : "secondary"}
            onClick={() => test(index)}
            disabled={busy !== null || !message.trim()}
          >
            {busy === index ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {draft.personaName || `Persona ${index + 1}`}
          </AdminButton>
        ))}
      </div>

      {error && <p className="mt-3 text-[12px] text-[#FF3B3B]">{error}</p>}

      {history.length > 0 && (
        <ul className="mt-5 space-y-3">
          {history.slice(0, 6).map((exchange, index) => (
            <li
              key={index}
              className={cn(
                "rounded-lg border border-[#1E1E2E] bg-[#0A0A0F] p-3.5",
                index === 0 && "animate-rise"
              )}
            >
              <p className="text-[11.5px] text-[#A0A0B0]">
                You: <span className="text-white">{exchange.question}</span>
              </p>
              <div className="mt-2.5 flex gap-2.5">
                <Avatar name={exchange.persona} size={26} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <span className="text-[12px] font-semibold text-white">
                      {exchange.persona}
                    </span>
                    <span className="text-[10px] tabular-nums text-[#A0A0B0]/70">
                      {(exchange.elapsedMs / 1000).toFixed(1)}s
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#A0A0B0]">
                    {exchange.reply}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
