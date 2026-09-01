"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/types";

type Options = {
  webinarId: string;
  sessionId: string | null;
  registrantId: string | null;
};

function bySentAt(a: ChatMessage, b: ChatMessage) {
  const diff = new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime();
  // Rule 3: everything interleaves on wall-clock time. id only breaks ties.
  return diff !== 0 ? diff : a.id.localeCompare(b.id);
}

export function useRealtimeChat({ webinarId, sessionId, registrantId }: Options) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const index = useRef<Map<string, ChatMessage>>(new Map());

  // Upsert, not append: rows also arrive as UPDATEs when a message gets its
  // reply flags set, and the admin panel's badges read those flags.
  const merge = useCallback((incoming: ChatMessage[]) => {
    let changed = false;

    for (const message of incoming) {
      const existing = index.current.get(message.id);
      if (existing && existing.has_ai_reply === message.has_ai_reply &&
          existing.ai_reply_pending === message.ai_reply_pending) {
        continue;
      }
      index.current.set(message.id, message);
      changed = true;
    }

    if (!changed) return;
    setMessages([...index.current.values()].sort(bySentAt));
  }, []);

  // History first, so someone joining twenty minutes in walks into a room that
  // has clearly been talking for twenty minutes.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      const response = await fetch(
        `/api/webinar/${webinarId}/chat?sessionId=${sessionId}`,
        { cache: "no-store" }
      );
      if (!response.ok || cancelled) return;
      const { messages: history } = (await response.json()) as {
        messages: ChatMessage[];
      };
      merge(history);
    })();

    return () => {
      cancelled = true;
    };
  }, [webinarId, sessionId, merge]);

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          merge([payload.new as ChatMessage]);
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, merge]);

  const sendMessage = useCallback(
    async (content: string) => {
      const body = content.trim();
      if (!body || !sessionId || !registrantId) return false;

      const response = await fetch(`/api/webinar/${webinarId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, registrantId, content: body }),
      });

      if (!response.ok) return false;

      // Show it immediately rather than waiting for the round trip back through
      // Realtime; merge() drops the duplicate when it arrives.
      const { message } = (await response.json()) as { message: ChatMessage };
      merge([message]);
      return true;
    },
    [webinarId, sessionId, registrantId, merge]
  );

  return { messages, sendMessage, connected };
}
