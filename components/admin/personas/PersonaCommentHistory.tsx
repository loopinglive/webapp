"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { AdminButton, TextArea } from "@/components/admin/ui/Field";
import { TimestampInput } from "@/components/admin/ui/TimestampInput";
import { formatOffset } from "@/lib/utils";
import type { FakePersona, TimedComment } from "@/types";

/** Everything this persona says, and a quick way to add one more. */
export function PersonaCommentHistory({
  webinarId,
  persona,
  onChanged,
}: {
  webinarId: string;
  persona: FakePersona;
  onChanged: () => void;
}) {
  const [comments, setComments] = useState<TimedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [content, setContent] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/comments`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { comments: TimedComment[] };
      setComments(
        payload.comments.filter((comment) => comment.persona_id === persona.id)
      );
    }
    setLoading(false);
  }, [webinarId, persona.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function add() {
    if (!content.trim()) return;
    setError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaId: persona.id,
        content,
        offsetSeconds: offset,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not add that comment.");
      return;
    }

    setContent("");
    setAdding(false);
    await load();
    onChanged();
  }

  async function remove(commentId: string) {
    await fetch(
      `/api/admin/webinar/${webinarId}/comments?commentId=${commentId}`,
      { method: "DELETE" }
    );
    await load();
    onChanged();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
          Comments ({comments.length})
        </h3>
        <AdminButton variant="ghost" onClick={() => setAdding((open) => !open)}>
          <Plus className="h-3.5 w-3.5" />
          Add
        </AdminButton>
      </div>

      {adding && (
        <div className="mt-3 space-y-3 rounded-xl border border-[#6C47FF]/30 bg-[#12121A] p-3.5">
          <TextArea
            rows={2}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What do they say?"
          />
          <div className="flex items-center gap-2">
            <TimestampInput value={offset} onChange={setOffset} className="w-32" />
            <AdminButton onClick={add} disabled={!content.trim()}>
              Save
            </AdminButton>
          </div>
          {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}
        </div>
      )}

      {loading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-[#6C47FF]" />
        </div>
      ) : comments.length === 0 ? (
        <p className="mt-6 text-center text-[12.5px] text-[#A0A0B0]">
          Nothing scheduled for {persona.name} yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="group flex items-start gap-3 rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3.5 py-2.5"
            >
              <span className="shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-[#6C47FF]">
                {formatOffset(comment.video_offset_seconds)}
              </span>
              <p className="min-w-0 flex-1 break-words text-[12.5px] leading-relaxed text-[#A0A0B0]">
                {comment.content}
              </p>
              <button
                onClick={() => remove(comment.id)}
                aria-label="Delete comment"
                className="shrink-0 text-[#A0A0B0] opacity-0 transition-opacity hover:text-[#FF3B3B] group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
