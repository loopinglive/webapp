"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_type: "attendee" | "host";
  content: string;
  sent_at: string;
  is_read: boolean;
};

/**
 * A private thread between one registrant and the host. Used by both the
 * attendee's widget (registrantId = themselves) and the host's inbox
 * (registrantId = whichever thread they have open).
 */
export function usePrivateMessages({
  webinarId,
  sessionId,
  registrantId,
}: {
  webinarId: string;
  sessionId: string | null;
  registrantId: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const index = useRef<Map<string, Message>>(new Map());

  const merge = useCallback((rows: Message[]) => {
    for (const row of rows) index.current.set(row.id, row);
    setMessages(
      [...index.current.values()].sort((a, b) => a.sent_at.localeCompare(b.sent_at))
    );
  }, []);

  useEffect(() => {
    if (!sessionId || !registrantId) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    (async () => {
      index.current.clear();
      setLoading(true);
      const response = await fetch(
        `/api/webinar/${webinarId}/private-messages?sessionId=${sessionId}&registrantId=${registrantId}`,
        { cache: "no-store" }
      );
      if (response.ok) {
        const { messages: history } = (await response.json()) as { messages: Message[] };
        merge(history);
      }
      setLoading(false);
    })();

    const supabase = createClient();
    const channel = supabase
      .channel(`private-messages:${sessionId}:${registrantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "private_messages",
          filter: `registrant_id=eq.${registrantId}`,
        },
        (payload) => merge([payload.new as Message])
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [webinarId, sessionId, registrantId, merge]);

  const send = useCallback(
    async (content: string, senderType: "attendee" | "host") => {
      if (!sessionId || !registrantId || !content.trim()) return;
      await fetch(`/api/webinar/${webinarId}/private-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, registrantId, senderType, content: content.trim() }),
      });
    },
    [webinarId, sessionId, registrantId]
  );

  return { messages, loading, send };
}
