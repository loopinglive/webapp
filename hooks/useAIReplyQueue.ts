"use client";

import { useEffect, useMemo, useRef } from "react";

import type { ChatMessage } from "@/types";

type Options = {
  webinarId: string;
  sessionId: string | null;
  messages: ChatMessage[];
  enabled: boolean;
};

const RETRY_AFTER_MS = 30_000;
/** Don't chase replies for backfilled history from earlier in the session. */
const FRESHNESS_MS = 120_000;

/**
 * Nudges the server to reply to messages that still need one.
 *
 * Deliberately dumb: it only says "this message exists". Whether a reply is
 * warranted, which persona sends it, whether that persona is in human mode, and
 * the guard against two viewers both spending a Claude call — all of that is
 * decided in /api/ai/reply, which is the only place that can decide it once.
 * Every viewer runs this hook, so it must never be the thing holding the logic.
 */
export function useAIReplyQueue({
  webinarId,
  sessionId,
  messages,
  enabled,
}: Options) {
  const attempts = useRef<Map<string, number>>(new Map());

  const needingReply = useMemo(
    () =>
      messages.filter(
        (message) =>
          !message.reply_to_message_id &&
          !message.has_ai_reply &&
          (message.is_real_user || message.is_fake)
      ),
    [messages]
  );

  useEffect(() => {
    if (!enabled || !sessionId || !needingReply.length) return;

    const trigger = () => {
      const now = Date.now();

      for (const message of needingReply) {
        const age = now - new Date(message.sent_at).getTime();
        if (age > FRESHNESS_MS) continue;

        const lastTried = attempts.current.get(message.id);
        // Retry once the claim would have gone stale — covers a function that
        // died mid-generation.
        if (lastTried && now - lastTried < RETRY_AFTER_MS) continue;

        attempts.current.set(message.id, now);

        void fetch("/api/ai/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: message.id,
            sessionId,
            webinarId,
          }),
        }).catch(() => {
          attempts.current.delete(message.id);
        });
      }
    };

    trigger();
    const id = setInterval(trigger, 10_000);
    return () => clearInterval(id);
  }, [webinarId, sessionId, needingReply, enabled]);

  return {
    pendingCount: needingReply.filter((message) => message.is_real_user).length,
    queuedMessages: needingReply,
  };
}
