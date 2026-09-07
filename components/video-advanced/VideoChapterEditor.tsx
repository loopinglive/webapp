"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { ChapterTimeline } from "@/components/video-advanced/ChapterTimeline";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { useVideoChapters } from "@/hooks/useVideoChapters";
import { formatOffset, parseOffset } from "@/lib/utils";

export function VideoChapterEditor({ webinarId, durationSeconds }: { webinarId: string; durationSeconds: number }) {
  const { chapters, addChapter, removeChapter } = useVideoChapters(webinarId);
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [start, setStart] = useState("00:00:00");
  const [end, setEnd] = useState("00:00:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const startSeconds = parseOffset(start);
    const endSeconds = parseOffset(end);

    if (!title.trim()) {
      setError("Give the chapter a title.");
      return;
    }
    if (endSeconds <= startSeconds) {
      setError("End time must be after the start time.");
      return;
    }

    setSaving(true);
    const result = await addChapter({ title: title.trim(), startSeconds, endSeconds });
    setSaving(false);

    if (!result.chapter) {
      setError(result.error ?? "Could not save that chapter.");
      return;
    }

    setTitle("");
    toast.success("Chapter added.");
  }

  return (
    <div className="space-y-6">
      {chapters && chapters.length > 0 && (
        <ChapterTimeline chapters={chapters} durationSeconds={durationSeconds} />
      )}

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <h3 className="text-[13.5px] font-semibold text-ink">Add a chapter</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <label className="block">
            <span className="text-[11.5px] text-ink-faint">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="The Offer Reveal"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-void px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block">
            <span className="text-[11.5px] text-ink-faint">Starts</span>
            <input
              value={start}
              onChange={(event) => setStart(event.target.value)}
              placeholder="00:00:00"
              className="mt-1 h-10 w-28 rounded-lg border border-hairline bg-void px-3 text-center font-mono text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block">
            <span className="text-[11.5px] text-ink-faint">Ends</span>
            <input
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              placeholder="00:00:00"
              className="mt-1 h-10 w-28 rounded-lg border border-hairline bg-void px-3 text-center font-mono text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-[12px] text-[#FF6B6B]">{error}</p>}
        <button
          onClick={submit}
          disabled={saving}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add chapter
        </button>
      </div>

      {!chapters ? null : chapters.length === 0 ? (
        <EmptyState
          icon="🎬"
          title="No chapters yet"
          description="Add chapters to give replay and on-demand viewers a way to jump to the part that matters most."
        />
      ) : (
        <ul className="space-y-2">
          {chapters.map((chapter) => (
            <li
              key={chapter.id}
              className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3"
            >
              <div>
                <p className="text-[13px] font-medium text-ink">{chapter.title}</p>
                <p className="mt-0.5 font-mono text-[11.5px] text-ink-faint">
                  {formatOffset(chapter.start_seconds)} – {formatOffset(chapter.end_seconds)}
                </p>
              </div>
              <button
                onClick={() => removeChapter(chapter.id)}
                aria-label={`Delete ${chapter.title}`}
                className="grid h-8 w-8 place-items-center rounded-lg border border-hairline text-ink-faint transition-colors hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
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
