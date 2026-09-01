"use client";

import { useCallback, useRef, useState } from "react";
import { Pause, Play, Plus } from "lucide-react";

import { CommentPin } from "@/components/admin/comments/CommentPin";
import { AdminButton } from "@/components/admin/ui/Field";
import { colourForPersona } from "@/hooks/usePersonaComments";
import { formatOffset } from "@/lib/utils";
import type { FakePersona, TimedComment } from "@/types";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  src: string | null;
  poster: string | null;
  duration: number;
  currentTime: number;
  playing: boolean;
  comments: TimedComment[];
  personas: FakePersona[];
  selectedId: string | null;
  onSelect: (comment: TimedComment) => void;
  onSeek: (seconds: number) => void;
  onTogglePlay: () => void;
  onMove: (commentId: string, seconds: number) => void;
  onPinHere: () => void;
};

export function VideoScrubber({
  videoRef,
  src,
  poster,
  duration,
  currentTime,
  playing,
  comments,
  personas,
  selectedId,
  onSelect,
  onSeek,
  onTogglePlay,
  onMove,
  onPinHere,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragged = useRef(false);

  const secondsAt = useCallback(
    (clientX: number) => {
      const bar = barRef.current;
      if (!bar || !duration) return 0;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(ratio * duration);
    },
    [duration]
  );

  const startDrag = useCallback(
    (comment: TimedComment) => (event: React.PointerEvent) => {
      event.stopPropagation();
      event.preventDefault();
      dragged.current = false;
      setDraggingId(comment.id);

      const target = event.currentTarget as HTMLElement;
      target.setPointerCapture(event.pointerId);

      const onMoveEvent = (moveEvent: PointerEvent) => {
        dragged.current = true;
        onMove(comment.id, secondsAt(moveEvent.clientX));
      };

      const onUp = () => {
        target.releasePointerCapture(event.pointerId);
        target.removeEventListener("pointermove", onMoveEvent);
        target.removeEventListener("pointerup", onUp);
        setDraggingId(null);
      };

      target.addEventListener("pointermove", onMoveEvent);
      target.addEventListener("pointerup", onUp);
    },
    [onMove, secondsAt]
  );

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-[#1E1E2E] bg-black">
        {src ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster ?? undefined}
            controls={false}
            onContextMenu={(event) => event.preventDefault()}
            onClick={onTogglePlay}
            className="aspect-video w-full cursor-pointer bg-black"
          />
        ) : (
          <div className="grid aspect-video place-items-center text-[13px] text-[#A0A0B0]">
            Upload a video to start placing comments.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          disabled={!src}
          aria-label={playing ? "Pause" : "Play"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#6C47FF] text-white transition-transform duration-200 hover:bg-[#7C5AFF] active:scale-95 disabled:opacity-40"
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </button>

        <span className="shrink-0 font-mono text-[12px] tabular-nums text-white">
          {formatOffset(Math.floor(currentTime))}
        </span>

        {/* Timeline. Pins live above the bar so a click on the bar always seeks. */}
        <div className="relative min-w-0 flex-1 pt-9">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-9">
            <div className="pointer-events-auto relative h-full">
              {comments.map((comment) => (
                <CommentPin
                  key={comment.id}
                  comment={comment}
                  persona={personas.find((p) => p.id === comment.persona_id)}
                  colour={colourForPersona(personas, comment.persona_id)}
                  duration={duration}
                  selected={selectedId === comment.id}
                  dragging={draggingId === comment.id}
                  onSelect={() => {
                    // A drag ends with a click event; ignore that one.
                    if (dragged.current) {
                      dragged.current = false;
                      return;
                    }
                    onSelect(comment);
                    onSeek(comment.video_offset_seconds);
                  }}
                  onDragStart={startDrag(comment)}
                />
              ))}
            </div>
          </div>

          <div
            ref={barRef}
            onClick={(event) => onSeek(secondsAt(event.clientX))}
            className="group relative h-2 cursor-pointer rounded-full bg-[#1A1A2A]"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6C47FF] to-[#00D4FF]"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-transform group-hover:scale-110"
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        <span className="shrink-0 font-mono text-[12px] tabular-nums text-[#A0A0B0]">
          {formatOffset(duration)}
        </span>

        <AdminButton onClick={onPinHere} disabled={!src} className="shrink-0">
          <Plus className="h-3.5 w-3.5" />
          Pin comment here
        </AdminButton>
      </div>
    </div>
  );
}
