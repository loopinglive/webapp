"use client";

import { useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";

import { ChatPanel } from "@/components/webinar/ChatPanel";
import { cn } from "@/lib/utils";
import type { ChatMessage as Message } from "@/types";

type Props = {
  messages: Message[];
  onSend: (content: string) => Promise<boolean>;
  senderName: string | null;
  canChat: boolean;
  connected: boolean;
  pinnedMessage?: string | null;
};

const SWIPE_CLOSE_PX = 70;

/**
 * Rule 6: on mobile the chat is a drawer over the bottom 60% of the screen. The
 * video keeps its own space above and is never covered.
 */
export function MobileChatDrawer({
  messages,
  onSend,
  senderName,
  canChat,
  connected,
  pinnedMessage,
}: Props) {
  const [open, setOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const startY = useRef<number | null>(null);

  // Anything that arrived while the drawer was open has been seen, so the
  // badge only counts what lands after it closes.
  const close = () => {
    setReadCount(messages.length);
    setOpen(false);
  };

  const unread = open ? 0 : Math.max(0, messages.length - readCount);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-24 right-4 z-40 grid h-13 w-13 place-items-center rounded-full bg-[#6C47FF] text-white shadow-[0_12px_36px_-8px_#6C47FF] transition-transform duration-200 active:scale-95 lg:hidden"
          style={{ height: 52, width: 52 }}
        >
          <MessageCircle className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-[#00D4FF] px-1.5 text-[10px] font-bold leading-5 text-[#0A0A0F]">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      )}

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 h-[60dvh] lg:hidden",
          "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        )}
        style={open && dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        role="dialog"
        aria-label="Live chat"
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-t-2xl border-t border-[#1E1E2E] bg-[#12121A] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.9)]">
          {/* Grab handle — drag down to dismiss. */}
          <div
            onTouchStart={(event) => {
              startY.current = event.touches[0].clientY;
            }}
            onTouchMove={(event) => {
              if (startY.current === null) return;
              setDragY(Math.max(0, event.touches[0].clientY - startY.current));
            }}
            onTouchEnd={() => {
              if (dragY > SWIPE_CLOSE_PX) close();
              setDragY(0);
              startY.current = null;
            }}
            className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3"
          >
            <span className="h-1 w-10 rounded-full bg-[#1E1E2E]" />
            <button
              onClick={close}
              aria-label="Close chat"
              className="grid h-7 w-7 place-items-center rounded-full text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ChatPanel
            messages={messages}
            onSend={onSend}
            senderName={senderName}
            canChat={canChat}
            connected={connected}
            pinnedMessage={pinnedMessage}
            className="min-h-0 flex-1 bg-transparent backdrop-blur-none"
          />
        </div>
      </div>
    </>
  );
}
