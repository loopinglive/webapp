"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";

import { cn } from "@/lib/utils";

export function ChatInput({
  onSend,
  senderName,
  disabled,
}: {
  onSend: (content: string) => Promise<boolean>;
  senderName: string | null;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = value.trim().length > 0 && !sending && !disabled;

  async function send() {
    if (!canSend) return;
    setSending(true);
    const ok = await onSend(value);
    if (ok) setValue("");
    setSending(false);
  }

  return (
    <div className="border-t border-[#1E1E2E] p-3">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-[#1E1E2E] bg-[#0A0A0F] pl-4 pr-1.5 py-1.5",
          "transition-colors duration-200 focus-within:border-[#6C47FF]/70"
        )}
      >
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          maxLength={500}
          placeholder={disabled ? "Register to join the chat" : "Say something..."}
          aria-label="Message"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-[#A0A0B0]/60 focus:outline-none disabled:cursor-not-allowed"
        />

        <button
          onClick={send}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-200",
            canSend
              ? "bg-[#6C47FF] text-white hover:bg-[#7C5AFF] active:scale-95"
              : "bg-[#1E1E2E] text-[#A0A0B0]/50"
          )}
        >
          <SendHorizonal className="h-3.5 w-3.5" />
        </button>
      </div>

      {senderName && (
        <p className="mt-2 px-1 text-[10.5px] text-[#A0A0B0]/60">
          Chatting as <span className="text-[#A0A0B0]">{senderName}</span>
        </p>
      )}
    </div>
  );
}
