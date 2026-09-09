"use client";

import type { VideoChapter } from "@/hooks/useVideoChapters";
import { cn, formatOffset } from "@/lib/utils";

export function ChapterNavigation({
  chapters,
  currentTime,
  onSeek,
}: {
  chapters: VideoChapter[];
  currentTime: number;
  onSeek: (seconds: number) => void;
}) {
  if (chapters.length === 0) return null;

  return (
    <div className="rounded-2xl border border-hairline bg-surface">
      <div className="border-b border-hairline px-4 py-3 text-[13px] font-semibold text-ink">
        Chapters
      </div>
      <ul className="max-h-[50dvh] space-y-0.5 overflow-y-auto p-2">
        {chapters.map((chapter) => {
          const active = currentTime >= chapter.start_seconds && currentTime < chapter.end_seconds;
          return (
            <li key={chapter.id}>
              <button
                onClick={() => onSeek(chapter.start_seconds)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors",
                  active ? "bg-accent/15 text-ink" : "text-ink/70 hover:bg-surface-2 hover:text-ink"
                )}
              >
                <span className="truncate text-[13px]">{chapter.title}</span>
                <span className="ml-2 shrink-0 font-mono text-[11px] text-ink/40">
                  {formatOffset(chapter.start_seconds)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
