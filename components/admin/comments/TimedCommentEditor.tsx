"use client";

import { useMemo, useState } from "react";
import { List, Loader2, Trash2, Waypoints } from "lucide-react";

import { CommentForm } from "@/components/admin/comments/CommentForm";
import { GenerateFromTranscript } from "@/components/admin/comments/GenerateFromTranscript";
import { CommentSidebar } from "@/components/admin/comments/CommentSidebar";
import { VideoScrubber } from "@/components/admin/comments/VideoScrubber";
import {
  SectionHeader,
  useSetupContext,
} from "@/components/admin/webinar/WebinarSetupShell";
import { Avatar } from "@/components/ui/Avatar";
import { colourForPersona, usePersonaComments } from "@/hooks/usePersonaComments";
import { useTimeline } from "@/hooks/useTimeline";
import { cn, formatOffset } from "@/lib/utils";
import type { TimedComment } from "@/types";

export function TimedCommentEditor({ webinarId }: { webinarId: string }) {
  const { webinar } = useSetupContext();
  const {
    comments,
    personas,
    addComment,
    updateComment,
    deleteComment,
    loading,
    error,
    clearError,
  } = usePersonaComments(webinarId);

  const duration = webinar?.video_duration_seconds ?? 0;
  const timeline = useTimeline({ durationSeconds: duration });

  const [view, setView] = useState<"timeline" | "list">("timeline");
  const [filterId, setFilterId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TimedComment | null>(null);
  const [draftOffset, setDraftOffset] = useState(0);

  const visible = useMemo(
    () =>
      filterId
        ? comments.filter((comment) => comment.persona_id === filterId)
        : comments,
    [comments, filterId]
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const comment of comments) {
      map.set(comment.persona_id, (map.get(comment.persona_id) ?? 0) + 1);
    }
    return map;
  }, [comments]);

  return (
    <>
      <SectionHeader
        title="Timed comments"
        description={`${comments.length} comment${comments.length === 1 ? "" : "s"} scheduled across your video`}
        action={
          <div className="flex items-center gap-2">
          <GenerateFromTranscript
            webinarId={webinarId}
            personas={personas}
            onAccept={addComment}
          />
          <div className="flex items-center gap-1 rounded-full border border-[#2A2A3A] bg-[#1A1A2A] p-1">
            {[
              { id: "timeline" as const, label: "Timeline", icon: Waypoints },
              { id: "list" as const, label: "List", icon: List },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setView(option.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors",
                  view === option.id
                    ? "bg-[#6C47FF] text-white"
                    : "text-[#A0A0B0] hover:text-white"
                )}
              >
                <option.icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
          </div>
          </div>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : view === "timeline" ? (
          <>
            <VideoScrubber
              videoRef={timeline.videoRef}
              src={webinar?.video_url ?? null}
              poster={webinar?.thumbnail_url ?? null}
              duration={duration}
              currentTime={timeline.currentTime}
              playing={timeline.playing}
              comments={visible}
              personas={personas}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
              onSeek={timeline.seekTo}
              onTogglePlay={timeline.togglePlay}
              onMove={(commentId, seconds) => {
                void updateComment(commentId, { offsetSeconds: seconds });
                setSelected((current) =>
                  current?.id === commentId
                    ? { ...current, video_offset_seconds: seconds }
                    : current
                );
              }}
              onPinHere={() => {
                setSelected(null);
                setDraftOffset(Math.floor(timeline.currentTime));
              }}
            />

            <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
              <CommentSidebar
                personas={personas}
                counts={counts}
                activeId={filterId}
                onSelect={setFilterId}
              />

              <div className="max-w-md">
                <CommentForm
                  // Remounting is how the form resets between pins.
                  key={selected?.id ?? `new-${draftOffset}`}
                  personas={personas}
                  duration={duration}
                  comment={selected}
                  draftOffset={draftOffset}
                  error={error}
                  onSave={async (input) => {
                    clearError();
                    if (selected) {
                      return updateComment(selected.id, {
                        personaId: input.personaId,
                        content: input.content,
                        offsetSeconds: input.offsetSeconds,
                      });
                    }
                    return Boolean(await addComment(input));
                  }}
                  onDelete={
                    selected
                      ? () => {
                          void deleteComment(selected.id);
                          setSelected(null);
                        }
                      : undefined
                  }
                  onCancel={() => setSelected(null)}
                />
              </div>
            </div>
          </>
        ) : (
          <ListView
            comments={visible}
            personas={personas}
            onEdit={(comment) => {
              setSelected(comment);
              setView("timeline");
              timeline.seekTo(comment.video_offset_seconds);
            }}
            onDelete={deleteComment}
          />
        )}
      </div>
    </>
  );
}

function ListView({
  comments,
  personas,
  onEdit,
  onDelete,
}: {
  comments: TimedComment[];
  personas: import("@/types").FakePersona[];
  onEdit: (comment: TimedComment) => void;
  onDelete: (commentId: string) => void;
}) {
  if (!comments.length) {
    return (
      <p className="rounded-xl border border-dashed border-[#3A3A4A] px-6 py-16 text-center text-[13.5px] text-[#A0A0B0]">
        Nothing scheduled yet. Switch to the timeline and pin your first comment.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E1E2E]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#1E1E2E] bg-[#12121A] text-left">
            {["Time", "Persona", "Comment", ""].map((heading) => (
              <th
                key={heading}
                className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E1E2E]">
          {comments.map((comment) => {
            const persona = personas.find((p) => p.id === comment.persona_id);
            return (
              <tr
                key={comment.id}
                className="group bg-[#0D0D17] transition-colors hover:bg-[#12121A]"
              >
                <td className="px-4 py-2.5 font-mono text-[11.5px] tabular-nums text-[#6C47FF]">
                  {formatOffset(comment.video_offset_seconds)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: colourForPersona(personas, comment.persona_id),
                      }}
                    />
                    <Avatar
                      name={persona?.name ?? "?"}
                      avatarUrl={persona?.avatar_url}
                      size={22}
                    />
                    <span className="truncate text-[12.5px] text-white">
                      {persona?.name ?? "Unknown"}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[12.5px] text-[#A0A0B0]">
                  {comment.content}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => onEdit(comment)}
                      className="rounded-lg px-2.5 py-1 text-[11.5px] text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(comment.id)}
                      aria-label="Delete"
                      className="grid h-7 w-7 place-items-center rounded-lg text-[#A0A0B0] transition-colors hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
