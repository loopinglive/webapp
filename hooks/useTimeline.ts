"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  durationSeconds: number;
};

/**
 * Keeps the editor's video element and its timeline in step.
 *
 * Unlike the room's playhead, this one is fully scrubbable — the host needs to
 * hunt for the exact moment a comment should land.
 */
export function useTimeline({ durationSeconds }: Options) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => setCurrentTime(video.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      const clamped = Math.min(Math.max(0, seconds), durationSeconds);
      setCurrentTime(clamped);
      if (videoRef.current) videoRef.current.currentTime = clamped;
    },
    [durationSeconds]
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }, []);

  /** Fraction (0–1) of the bar a pointer event landed at. */
  const positionFromEvent = useCallback(
    (event: { clientX: number }, element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    },
    []
  );

  return {
    videoRef,
    currentTime,
    duration: durationSeconds,
    playing,
    scrubbing,
    setScrubbing,
    seekTo,
    togglePlay,
    positionFromEvent,
    percent: durationSeconds ? (currentTime / durationSeconds) * 100 : 0,
  };
}
