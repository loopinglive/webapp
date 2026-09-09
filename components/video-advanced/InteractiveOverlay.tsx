"use client";

import { useEffect, useRef, useState } from "react";
import { PartyPopper, Share2 } from "lucide-react";

import { VideoHotspot } from "@/components/video-advanced/VideoHotspot";
import type { InteractiveElement } from "@/hooks/useInteractiveElements";
import type { VideoChapter } from "@/hooks/useVideoChapters";

const MILESTONES = [
  { at: 0.25, text: "You're a quarter of the way through!" },
  { at: 0.5, text: "Halfway there — the best part is coming." },
  { at: 0.75, text: "Almost there — stick around for the offer." },
  { at: 0.9, text: "Nearly done — don't miss what's next." },
];

/**
 * Everything that overlays the video, timed off currentTime: admin-configured
 * hotspots and share prompts, plus the two elements that need no
 * configuration at all — progress milestones (fixed 25/50/75/90% marks) and a
 * "now playing" card at each chapter transition.
 */
export function InteractiveOverlay({
  currentTime,
  duration,
  elements,
  chapters,
}: {
  currentTime: number;
  duration: number;
  elements: InteractiveElement[];
  chapters: VideoChapter[];
}) {
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const [chapterCard, setChapterCard] = useState<string | null>(null);
  const shownMilestones = useRef<Set<number>>(new Set());
  const shownChapters = useRef<Set<string>>(new Set());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!duration) return;
    const progress = currentTime / duration;

    for (const milestone of MILESTONES) {
      if (progress >= milestone.at && !shownMilestones.current.has(milestone.at)) {
        shownMilestones.current.add(milestone.at);
        setMilestoneText(milestone.text);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setMilestoneText(null), 3000);
      }
    }

    for (const chapter of chapters) {
      if (
        currentTime >= chapter.start_seconds &&
        currentTime < chapter.start_seconds + 3 &&
        !shownChapters.current.has(chapter.id)
      ) {
        shownChapters.current.add(chapter.id);
        setChapterCard(chapter.title);
        setTimeout(() => setChapterCard((current) => (current === chapter.title ? null : current)), 5000);
      }
    }
  }, [currentTime, duration, chapters]);

  const activeHotspots = elements.filter(
    (element) =>
      element.element_type === "hotspot" &&
      currentTime >= element.video_offset_seconds &&
      currentTime < element.video_offset_seconds + element.duration_seconds
  );

  const activeSharePrompt = elements.find(
    (element) =>
      element.element_type === "social_share" &&
      currentTime >= element.video_offset_seconds &&
      currentTime < element.video_offset_seconds + element.duration_seconds
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      {activeHotspots.map((hotspot) => (
        <div key={hotspot.id} className="pointer-events-auto absolute inset-0">
          <VideoHotspot
            x={hotspot.config.x as number}
            y={hotspot.config.y as number}
            label={hotspot.config.label as string}
            link={hotspot.config.link as string}
          />
        </div>
      ))}

      {chapterCard && (
        <div className="absolute left-4 top-4 rounded-xl bg-black/80 px-4 py-2.5 text-[12.5px] font-medium text-ink backdrop-blur-sm">
          Now playing: {chapterCard}
        </div>
      )}

      {milestoneText && (
        <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-[12.5px] font-medium text-ink backdrop-blur-sm">
          <PartyPopper className="h-3.5 w-3.5 text-[#FFD93D]" />
          {milestoneText}
        </div>
      )}

      {activeSharePrompt && (
        <div className="pointer-events-auto absolute bottom-16 right-4 flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-[12.5px] font-medium text-ink backdrop-blur-sm">
          <Share2 className="h-3.5 w-3.5 text-accent-soft" />
          {(activeSharePrompt.config.message as string) || "Share this webinar!"}
        </div>
      )}
    </div>
  );
}
