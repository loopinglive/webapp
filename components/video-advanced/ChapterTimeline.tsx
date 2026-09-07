import type { VideoChapter } from "@/hooks/useVideoChapters";
import { formatOffset } from "@/lib/utils";

const BAND_COLOURS = ["#6C47FF", "#00D4FF", "#FF9F43", "#00C851", "#FF5A5A", "#8B6DFF"];

/** Coloured bands over a duration bar, one per chapter — used in the admin editor. */
export function ChapterTimeline({
  chapters,
  durationSeconds,
}: {
  chapters: VideoChapter[];
  durationSeconds: number;
}) {
  if (!durationSeconds || chapters.length === 0) return null;

  return (
    <div>
      <div className="relative h-8 w-full overflow-hidden rounded-lg bg-surface-2">
        {chapters.map((chapter, index) => {
          const left = (chapter.start_seconds / durationSeconds) * 100;
          const width = ((chapter.end_seconds - chapter.start_seconds) / durationSeconds) * 100;
          return (
            <div
              key={chapter.id}
              title={`${chapter.title} — ${formatOffset(chapter.start_seconds)}`}
              className="absolute top-0 h-full border-r border-void/60"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: BAND_COLOURS[index % BAND_COLOURS.length],
                opacity: 0.75,
              }}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-faint">
        <span>{formatOffset(0)}</span>
        <span>{formatOffset(durationSeconds)}</span>
      </div>
    </div>
  );
}
