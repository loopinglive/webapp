"use client";

import { useEffect, useRef, useState } from "react";

import { AdminMessageCard } from "@/components/admin/AdminMessageCard";
import type { AiPersona, ChatMessage, PersonaModeMap } from "@/types";

type Props = {
  messages: ChatMessage[];
  repliesByParent: Map<string, ChatMessage[]>;
  sessionId: string;
  personas: AiPersona[];
  personaModes: PersonaModeMap;
};

export function AdminChatFeed({
  messages,
  repliesByParent,
  sessionId,
  personas,
  personaModes,
}: Props) {
  const [openReplyId, setOpenReplyId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const feed = feedRef.current;
    // Don't yank the view while the admin is reading back or mid-reply.
    if (!feed || !pinned.current || openReplyId) return;
    feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
  }, [messages, openReplyId]);

  return (
    <div
      ref={feedRef}
      onScroll={(event) => {
        const el = event.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      }}
      className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-4"
    >
      {messages.length === 0 ? (
        <p className="px-3 py-12 text-center text-[13px] text-[#A0A0B0]/70">
          Nothing matches this filter yet.
        </p>
      ) : (
        messages.map((message) => (
          <AdminMessageCard
            key={message.id}
            message={message}
            replies={repliesByParent.get(message.id) ?? []}
            sessionId={sessionId}
            personas={personas}
            personaModes={personaModes}
            replyOpen={openReplyId === message.id}
            onToggleReply={() =>
              setOpenReplyId((current) =>
                current === message.id ? null : message.id
              )
            }
          />
        ))
      )}
    </div>
  );
}
