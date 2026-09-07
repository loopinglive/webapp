"use client";

import { useCallback, useEffect, useState } from "react";

import type { SupportChatMessage } from "@/lib/anthropic";

export type SupportConversation = {
  id: string;
  registrant_id: string;
  status: "open" | "resolved" | "escalated";
  channel: string;
  messages: SupportChatMessage[];
  resolved_at: string | null;
  satisfaction_rating: number | null;
  created_at: string;
  updated_at: string;
  registrant: { id: string; full_name: string; email: string } | null;
};

export function useSupportConversations(webinarId: string) {
  const [conversations, setConversations] = useState<SupportConversation[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/support-conversations`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { conversations: SupportConversation[] };
      setConversations(payload.conversations);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const setStatus = useCallback(
    async (conversationId: string, status: "open" | "resolved" | "escalated") => {
      const response = await fetch(
        `/api/admin/webinar/${webinarId}/support-conversations/${conversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  return { conversations, loading, setStatus };
}
