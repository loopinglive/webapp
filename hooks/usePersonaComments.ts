"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { FakePersona, TimedComment } from "@/types";

/** Cycled so each persona keeps a stable colour on the timeline. */
export const PIN_COLOURS = [
  "#6C47FF",
  "#00D4FF",
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#FF9500",
  "#C77DFF",
  "#4CC9F0",
];

export function colourForPersona(personas: FakePersona[], personaId: string) {
  const index = personas.findIndex((persona) => persona.id === personaId);
  return PIN_COLOURS[(index < 0 ? 0 : index) % PIN_COLOURS.length];
}

export function usePersonaComments(webinarId: string) {
  const [comments, setComments] = useState<TimedComment[]>([]);
  const [personas, setPersonas] = useState<FakePersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [commentsResponse, personasResponse] = await Promise.all([
        fetch(`/api/admin/webinar/${webinarId}/comments`, { cache: "no-store" }),
        fetch(`/api/admin/webinar/${webinarId}/personas`, { cache: "no-store" }),
      ]);

      if (commentsResponse.ok) {
        const payload = (await commentsResponse.json()) as {
          comments: TimedComment[];
        };
        setComments(payload.comments);
      }
      if (personasResponse.ok) {
        const payload = (await personasResponse.json()) as {
          personas: FakePersona[];
        };
        setPersonas(payload.personas);
      }
    } catch {
      setError("Could not load the comment script.");
    } finally {
      setLoading(false);
    }
  }, [webinarId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const addComment = useCallback(
    async (input: { personaId: string; content: string; offsetSeconds: number }) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await response.json()) as {
        comment?: TimedComment;
        error?: string;
      };

      if (!response.ok || !payload.comment) {
        setError(payload.error ?? "Could not add that comment.");
        return null;
      }

      setError(null);
      setComments((current) => [...current, payload.comment!].sort(byOffset));
      return payload.comment;
    },
    [webinarId]
  );

  const updateComment = useCallback(
    async (
      commentId: string,
      patch: { content?: string; offsetSeconds?: number; personaId?: string }
    ) => {
      // Optimistic: dragging a pin has to track the cursor, not the network.
      const previous = comments;
      setComments((current) =>
        current
          .map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  ...(patch.content !== undefined && { content: patch.content }),
                  ...(patch.offsetSeconds !== undefined && {
                    video_offset_seconds: patch.offsetSeconds,
                  }),
                  ...(patch.personaId !== undefined && {
                    persona_id: patch.personaId,
                  }),
                }
              : comment
          )
          .sort(byOffset)
      );

      const response = await fetch(`/api/admin/webinar/${webinarId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, ...patch }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Could not save that change.");
        setComments(previous);
        return false;
      }

      setError(null);
      return true;
    },
    [comments, webinarId]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      setComments((current) =>
        current.filter((comment) => comment.id !== commentId)
      );
      await fetch(
        `/api/admin/webinar/${webinarId}/comments?commentId=${commentId}`,
        { method: "DELETE" }
      );
    },
    [webinarId]
  );

  const commentsByPersona = useMemo(() => {
    const map = new Map<string, TimedComment[]>();
    for (const comment of comments) {
      const bucket = map.get(comment.persona_id) ?? [];
      bucket.push(comment);
      map.set(comment.persona_id, bucket);
    }
    return map;
  }, [comments]);

  return {
    comments,
    commentsByPersona,
    personas,
    addComment,
    updateComment,
    deleteComment,
    refresh: load,
    loading,
    error,
    clearError: () => setError(null),
  };
}

function byOffset(a: TimedComment, b: TimedComment) {
  return a.video_offset_seconds - b.video_offset_seconds;
}
