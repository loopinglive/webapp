"use client";

import { useEffect, useMemo, useRef } from "react";

import { Pin } from "lucide-react";

import { ChatInput } from "@/components/webinar/ChatInput";
import { ChatMessage } from "@/components/webinar/ChatMessage";
import { EmojiReactions } from "@/components/webinar/EmojiReactions";
import { cn } from "@/lib/utils";
import type { ChatMessage as Message } from "@/types";

type Props = {
  messages: Message[];
  onSend: (content: string) => Promise<boolean>;
  senderName: string | null;
  canChat: boolean;
  connected: boolean;
  className?: string;
  onClose?: () => void;
  /** Host's scheduled pin, showing for its window. */
  pinnedMessage?: string | null;
};

export function ChatPanel({
  messages,
  onSend,
  senderName,
  canChat,
  connected,
  className,
  onClose,
  pinnedMessage,
}: Props) {
  const feedRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Threaded replies show "↩ replying to @Name", which means resolving the
  // parent's sender from the messages we already hold.
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const message of messages) map.set(message.id, message.sender_name);
    return map;
  }, [messages]);

  // Follow the conversation unless the viewer has scrolled up to read back.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !pinned.current) return;
    feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <section
      // The skip link's target.
      id="webinar-chat"
      className={cn(
        "flex min-h-0 flex-col border-[#1E1E2E] bg-[#12121A]/80 backdrop-blur-2xl",
        className
      )}
      aria-label="Live chat"
    >
      <header className="flex items-center justify-between border-b border-[#1E1E2E] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {connected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C851] opacity-70" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                connected ? "bg-[#00C851]" : "bg-[#A0A0B0]/50"
              )}
            />
          </span>
          <h2 className="text-[13.5px] font-semibold text-white">Live Chat</h2>
          {/* The dot beside this is the only other indication, and colour on
              its own is not an indication. */}
          <span className="sr-only" role="status">
            {connected ? "Chat connected" : "Chat reconnecting"}
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-[12px] text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        )}
      </header>

      {pinnedMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex animate-rise items-start gap-2 border-b border-[#1E1E2E] bg-[#6C47FF]/10 px-4 py-2.5"
        >
          <Pin aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6C47FF]" />
          <p className="text-[12.5px] leading-relaxed text-white">
            <span className="sr-only">Pinned by the host: </span>
            {pinnedMessage}
          </p>
        </div>
      )}

      {/*
        The feed is a scrolling region, so it needs to be focusable — otherwise
        a keyboard user can reach the input at the bottom and never read a word
        of the conversation above it.

        aria-live is deliberately off. `role="log"` would announce every arrival,
        and this room is rate-limited to four messages a second; a screen reader
        narrating that is not an accessible experience, it is an unusable one.
        The pinned message above is the exception, because the host chose it.
      */}
      <div
        ref={feedRef}
        role="log"
        aria-live="off"
        aria-label="Chat messages"
        tabIndex={0}
        onScroll={(event) => {
          const el = event.currentTarget;
          pinned.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6C47FF]/70"
      >
        {messages.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-[#A0A0B0]/70">
            Say hello — the room is just getting going.
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="animate-rise">
              <ChatMessage
                message={message}
                replyToName={
                  message.reply_to_message_id
                    ? (nameById.get(message.reply_to_message_id) ?? null)
                    : null
                }
              />
            </div>
          ))
        )}
      </div>

      <EmojiReactions onSend={onSend} disabled={!canChat} />
      <ChatInput onSend={onSend} senderName={senderName} disabled={!canChat} />
    </section>
  );
}
