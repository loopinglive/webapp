"use client";

import { useEffect, useRef, useState } from "react";

import type { TimedCommentWithPersona } from "@/types";

type Options = {
  webinarId: string;
  sessionId: string | null;
  /** Playhead in seconds, ticking once a second. */
  currentTime: number;
  enabled: boolean;
};

/**
 * Watches the playhead against the webinar's scripted comments and asks the
 * server to drop each one as its offset passes.
 *
 * Every viewer runs this, so the insert has to be idempotent — that is handled
 * server-side by the unique (session_id, timed_comment_id) constraint. The room
 * then receives the single row back over Realtime like any other message, which
 * is what keeps a persona comment identical to a real one (rule 4).
 */
export function useTimedComments({
  webinarId,
  sessionId,
  currentTime,
  enabled,
}: Options) {
  const [comments, setComments] = useState<TimedCommentWithPersona[]>([]);
  const fired = useRef<Set<string>>(new Set());
  const syncing = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const response = await fetch(
        `/api/webinar/timed-comments?webinarId=${webinarId}`,
        { cache: "no-store" }
      );
      if (!response.ok || cancelled) return;
      const { comments: loaded } = (await response.json()) as {
        comments: TimedCommentWithPersona[];
      };
      setComments(loaded);
    })();

    return () => {
      cancelled = true;
    };
  }, [webinarId]);

  useEffect(() => {
    if (!enabled || !sessionId || !comments.length) return;

    const due = comments.filter(
      (comment) =>
        comment.video_offset_seconds <= currentTime && !fired.current.has(comment.id)
    );

    if (!due.length || syncing.current) return;

    due.forEach((comment) => fired.current.add(comment.id));
    syncing.current = true;

    void fetch(`/api/webinar/${webinarId}/chat/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, elapsedSeconds: Math.floor(currentTime) }),
    })
      .catch(() => {
        // Let the next tick retry the ones we just optimistically marked.
        due.forEach((comment) => fired.current.delete(comment.id));
      })
      .finally(() => {
        syncing.current = false;
      });
  }, [webinarId, sessionId, currentTime, comments, enabled]);

  return { comments, total: comments.length };
}
