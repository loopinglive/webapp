"use client";

import { useState } from "react";
import { Loader2, MessageCircleQuestion, Send, X } from "lucide-react";

import { useSupportChat } from "@/hooks/useSupportChat";
import { cn } from "@/lib/utils";

/**
 * A floating support-chat launcher for the watch room. Not mounted anywhere
 * yet -- see the comment on `useSupportChat`. Self-contained and ready to
 * drop in as `<SupportChatWidget webinarId={...} registrantId={...} sessionId={...} />`.
 */
export function SupportChatWidget({
  webinarId,
  registrantId,
  sessionId,
}: {
  webinarId: string;
  registrantId: string;
  sessionId: string | null;
}) {
  const { messages, sending, escalated, send } = useSupportChat(webinarId, registrantId, sessionId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  async function submit() {
    const message = draft.trim();
    if (!message || sending) return;
    setDraft("");
    await send(message);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#6C47FF] text-white shadow-[0_10px_30px_-10px_#6C47FF] transition-transform hover:scale-105"
        title="Ask a question"
      >
        <MessageCircleQuestion className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[420px] w-[320px] flex-col overflow-hidden rounded-2xl border border-[#1E1E2E] bg-[#0D0D17] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#1E1E2E] px-4 py-3">
        <p className="text-[13px] font-semibold text-white">Ask a question</p>
        <button onClick={() => setOpen(false)} className="text-[#6A6A80] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="px-2 text-[12.5px] text-[#6A6A80]">
            Have a question about the webinar or the offer? Ask here.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed",
                message.role === "attendee"
                  ? "self-end ml-auto bg-[#6C47FF] text-white"
                  : "self-start bg-[#1A1A2A] text-[#C8C8D4]"
              )}
            >
              {message.content}
            </div>
          ))}
          {sending && (
            <div className="self-start rounded-lg bg-[#1A1A2A] px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A0A0B0]" />
            </div>
          )}
        </div>
        {escalated && (
          <p className="mt-2 px-2 text-[11px] text-[#FF9500]">
            The host has been notified and will follow up on this.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-[#1E1E2E] p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder="Type your question…"
          className="h-9 flex-1 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3 text-[12.5px] text-white placeholder:text-[#6A6A80] focus:border-[#6C47FF] focus:outline-none"
        />
        <button
          onClick={() => void submit()}
          disabled={sending || !draft.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#6C47FF] text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
