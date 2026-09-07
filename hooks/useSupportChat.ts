"use client";

import { useCallback, useState } from "react";

export type SupportChatEntry = { role: "attendee" | "assistant"; content: string };

/**
 * Standalone attendee-facing support chat. Not currently mounted anywhere —
 * the watch room is mid-edit elsewhere in this working tree, and dropping a
 * new widget into a file under active concurrent change is how two changes
 * silently clobber each other. Drop `SupportChatWidget` into the watch room
 * once that settles; the hook and API are complete and working on their own.
 */
export function useSupportChat(webinarId: string, registrantId: string, sessionId: string | null) {
  const [messages, setMessages] = useState<SupportChatEntry[]>([]);
  const [sending, setSending] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const send = useCallback(
    async (message: string) => {
      setMessages((prev) => [...prev, { role: "attendee", content: message }]);
      setSending(true);
      try {
        const response = await fetch(`/api/webinar/${webinarId}/support-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrantId, sessionId, message }),
        });
        if (!response.ok) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Sorry, that didn't go through. Try again in a moment." },
          ]);
          return;
        }
        const payload = (await response.json()) as { reply: string; escalated: boolean };
        setMessages((prev) => [...prev, { role: "assistant", content: payload.reply }]);
        setEscalated(payload.escalated);
      } finally {
        setSending(false);
      }
    },
    [webinarId, registrantId, sessionId]
  );

  return { messages, sending, escalated, send };
}
