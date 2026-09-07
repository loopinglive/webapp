"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { usePrivateMessages } from "@/hooks/usePrivateMessages";
import { cn } from "@/lib/utils";

/** A small floating widget attendees use to message the host privately. */
export function PrivateMessageWidget({
  webinarId,
  sessionId,
  registrantId,
}: {
  webinarId: string;
  sessionId: string | null;
  registrantId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, send } = usePrivateMessages({ webinarId, sessionId, registrantId });

  if (!sessionId || !registrantId) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="mb-3 flex h-80 w-72 flex-col rounded-xl border border-white/10 bg-[#12121A] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
            <span className="text-[12.5px] font-medium text-white">Message the host</span>
            <button onClick={() => setOpen(false)} className="text-[#A0A0B0] hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3.5 py-3">
            {messages.length === 0 && (
              <p className="text-[12px] text-[#A0A0B0]">Only you and the host can see this.</p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-1.5 text-[12.5px]",
                  message.sender_type === "host"
                    ? "bg-[#6C47FF]/20 text-white"
                    : "ml-auto bg-[#1E1E2E] text-[#E5E5EA]"
                )}
              >
                {message.content}
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft, "attendee");
              setDraft("");
            }}
            className="flex items-center gap-2 border-t border-white/8 p-2.5"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3 py-2 text-[12.5px] text-white focus:border-[#6C47FF] focus:outline-none"
            />
            <button type="submit" className="text-[#6C47FF] hover:text-[#7C5AFF]">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-12 w-12 place-items-center rounded-full bg-[#6C47FF] text-white shadow-[0_8px_28px_-10px_#6C47FF] hover:bg-[#7C5AFF]"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
