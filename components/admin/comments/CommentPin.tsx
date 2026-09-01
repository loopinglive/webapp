"use client";

import { cn, formatOffset } from "@/lib/utils";
import type { FakePersona, TimedComment } from "@/types";

/**
 * One scheduled comment, sitting on the timeline at its offset.
 *
 * Pointer events rather than mouse events so a pin can be dragged on a trackpad
 * or a touchscreen, and setPointerCapture keeps the drag alive when the cursor
 * leaves the 10px-wide pin — which it does immediately.
 */
export function CommentPin({
  comment,
  persona,
  colour,
  duration,
  selected,
  dragging,
  onSelect,
  onDragStart,
}: {
  comment: TimedComment;
  persona: FakePersona | undefined;
  colour: string;
  duration: number;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onDragStart: (event: React.PointerEvent) => void;
}) {
  const left = duration ? (comment.video_offset_seconds / duration) * 100 : 0;

  return (
    <button
      onPointerDown={onDragStart}
      onClick={onSelect}
      style={{ left: `${left}%`, borderColor: colour }}
      className={cn(
        "group absolute top-0 z-10 -translate-x-1/2 cursor-grab touch-none active:cursor-grabbing",
        dragging && "z-30"
      )}
      aria-label={`${persona?.name ?? "Comment"} at ${formatOffset(comment.video_offset_seconds)}`}
    >
      <span
        style={{ background: colour }}
        className={cn(
          "block h-8 w-[3px] rounded-full transition-all duration-150",
          selected || dragging ? "scale-x-[2] shadow-[0_0_12px_currentColor]" : "",
          "group-hover:scale-x-[2]"
        )}
      />
      <span
        style={{ background: colour }}
        className={cn(
          "absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full transition-transform duration-150",
          selected || dragging ? "scale-125" : "group-hover:scale-125"
        )}
      />

      {/* Tooltip */}
      <span
        className={cn(
          "pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-40 w-max max-w-[220px] -translate-x-1/2",
          "rounded-lg border border-[#2A2A3A] bg-[#12121A] px-3 py-2 text-left opacity-0 shadow-xl transition-opacity duration-150",
          (selected || dragging) && "opacity-100",
          "group-hover:opacity-100"
        )}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: colour }}
          />
          <span className="truncate text-[11.5px] font-semibold text-white">
            {persona?.name ?? "Unknown"}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-[#A0A0B0]">
            {formatOffset(comment.video_offset_seconds)}
          </span>
        </span>
        <span className="mt-1 block line-clamp-2 text-[11.5px] leading-snug text-[#A0A0B0]">
          {comment.content}
        </span>
      </span>
    </button>
  );
}
