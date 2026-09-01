"use client";

import { useMemo, useState } from "react";

import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import type { AdminFilter, ChatMessage } from "@/types";

type Options = {
  webinarId: string;
  sessionId: string;
};

export function useAdminMessages({ webinarId, sessionId }: Options) {
  // The admin watches, never speaks as themselves — replies go out under a
  // persona through /api/admin/manual-reply.
  const { messages, connected } = useRealtimeChat({
    webinarId,
    sessionId,
    registrantId: null,
  });

  const [filter, setFilter] = useState<AdminFilter>("all");
  const [search, setSearch] = useState("");

  /** personaReplies.get(messageId) — the replies hanging off each message. */
  const repliesByParent = useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const message of messages) {
      if (!message.reply_to_message_id) continue;
      const bucket = map.get(message.reply_to_message_id) ?? [];
      bucket.push(message);
      map.set(message.reply_to_message_id, bucket);
    }
    return map;
  }, [messages]);

  const topLevel = useMemo(
    () => messages.filter((message) => !message.reply_to_message_id),
    [messages]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return topLevel.filter((message) => {
      if (filter === "real" && !message.is_real_user) return false;
      if (filter === "unanswered" && (!message.is_real_user || message.has_ai_reply)) {
        return false;
      }
      if (needle && !message.sender_name.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  }, [topLevel, filter, search]);

  const stats = useMemo(() => {
    const realUser = topLevel.filter((message) => message.is_real_user);
    return {
      total: messages.length,
      replied: topLevel.filter((message) => message.has_ai_reply).length,
      pending: realUser.filter((message) => !message.has_ai_reply).length,
      realUsers: realUser.length,
    };
  }, [messages, topLevel]);

  return {
    messages: filtered,
    allMessages: messages,
    repliesByParent,
    filter,
    setFilter,
    search,
    setSearch,
    connected,
    stats,
  };
}
