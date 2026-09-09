"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { ChapterNavigation } from "@/components/video-advanced/ChapterNavigation";
import { InteractiveOverlay } from "@/components/video-advanced/InteractiveOverlay";
import { useInteractiveElements } from "@/hooks/useInteractiveElements";
import { useVideoChapters } from "@/hooks/useVideoChapters";
import { progressiveUrl, streamUrl } from "@/lib/cloudinary-urls";
import type { TimedCommentWithPersona } from "@/types";

type Webinar = {
  id: string;
  title: string;
  description: string | null;
  on_demand_allow_seek: boolean;
  video_duration_seconds: number | null;
  video_public_id: string | null;
  video_url: string | null;
};

type Registrant = { id: string; full_name: string; watch_percentage: number | null };

/**
 * The on-demand watch experience: a plain, seekable (or seek-locked) player
 * with its own client-computed comment replay — deliberately not the shared
 * live chat channel, since there is no live session for an on-demand viewer to
 * share with anyone.
 */
export function OnDemandPlayer({
  token,
  webinar,
  registrant,
}: {
  token: string;
  webinar: Webinar;
  registrant: Registrant;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const maxWatched = useRef(0);
  const lastPing = useRef(0);
  const [comments, setComments] = useState<TimedCommentWithPersona[]>([]);
  const [visible, setVisible] = useState<TimedCommentWithPersona[]>([]);
  const shown = useRef<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(0);

  const duration = webinar.video_duration_seconds || 0;
  const { chapters } = useVideoChapters(webinar.id);
  const { elements } = useInteractiveElements(webinar.id);

  useEffect(() => {
    (async () => {
      const response = await fetch(`/api/webinar/timed-comments?webinarId=${webinar.id}`);
      if (response.ok) {
        const payload = await response.json();
        setComments(payload.comments ?? []);
      }
    })();
  }, [webinar.id]);

  useEffect(() => {
    fetch(`/api/webinar/${webinar.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrantId: registrant.id, action: "join" }),
    });
    return () => {
      fetch(`/api/webinar/${webinar.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrantId: registrant.id, action: "leave" }),
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    const current = video.currentTime;
    setCurrentTime(current);

    if (!webinar.on_demand_allow_seek && current > maxWatched.current + 2) {
      video.currentTime = maxWatched.current;
      return;
    }
    maxWatched.current = Math.max(maxWatched.current, current);

    for (const comment of comments) {
      if (shown.current.has(comment.id)) continue;
      if (comment.video_offset_seconds <= current) {
        shown.current.add(comment.id);
        setVisible((prev) => [...prev, comment]);
      }
    }

    if (current - lastPing.current >= 10) {
      lastPing.current = current;
      const duration = webinar.video_duration_seconds || video.duration || 1;
      const percentage = Math.min(100, (current / duration) * 100);

      fetch(`/api/on-demand/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchSeconds: current, watchPercentage: percentage }),
      });
      fetch(`/api/webinar/${webinar.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrantId: registrant.id,
          action: "progress",
          watchSeconds: current,
          watchPercentage: percentage,
        }),
      });
    }
  }

  function onSeeking() {
    const video = videoRef.current;
    if (!video || webinar.on_demand_allow_seek) return;
    if (video.currentTime > maxWatched.current + 2) {
      video.currentTime = maxWatched.current;
    }
  }

  const src = webinar.video_public_id ? streamUrl(webinar.video_public_id) : webinar.video_url;
  const fallback = webinar.video_public_id ? progressiveUrl(webinar.video_public_id) : webinar.video_url;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-2xl border border-hairline bg-black">
        <div className="relative">
          {src ? (
            <video
              ref={videoRef}
              controls
              className="aspect-video w-full"
              onTimeUpdate={onTimeUpdate}
              onSeeking={onSeeking}
            >
              <source src={src} type="application/x-mpegURL" />
              {fallback && <source src={fallback} type="video/mp4" />}
            </video>
          ) : (
            <div className="grid aspect-video place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-ink/40" />
            </div>
          )}
          {webinar.on_demand_allow_seek && src && (
            <InteractiveOverlay
              currentTime={currentTime}
              duration={duration}
              elements={elements ?? []}
              chapters={chapters ?? []}
            />
          )}
        </div>
        {!webinar.on_demand_allow_seek && (
          <p className="border-t border-hairline px-4 py-2 text-[11.5px] text-ink/40">
            Seeking ahead is disabled for this replay — you can watch back, not skip forward.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {webinar.on_demand_allow_seek && chapters && chapters.length > 0 && (
          <ChapterNavigation
            chapters={chapters}
            currentTime={currentTime}
            onSeek={(seconds) => {
              if (videoRef.current) videoRef.current.currentTime = seconds;
            }}
          />
        )}

        <div className="flex max-h-[70dvh] flex-1 flex-col rounded-2xl border border-hairline bg-surface">
          <div className="border-b border-hairline px-4 py-3 text-[13px] font-semibold text-ink">
            Live chat replay
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
            {visible.map((comment) => (
              <div key={comment.id} className="text-[13px] leading-snug">
                <span className="font-medium text-cyan">{comment.persona?.name ?? "Guest"}</span>{" "}
                <span className="text-ink/80">{comment.content}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
