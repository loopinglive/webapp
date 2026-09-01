"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** ISO start time of the session. */
  startsAt: string | null;
  durationSeconds: number;
  /** serverTime − device clock, in ms. */
  clockOffsetMs: number;
  onProgress?: (watchSeconds: number, percentage: number) => void;
};

/** How far the playhead may drift from the session clock before we correct it. */
const DRIFT_TOLERANCE_SECONDS = 2;
const PROGRESS_INTERVAL_SECONDS = 10;

/**
 * Pins the video to the session clock.
 *
 * The playhead is never "wherever the video got to" — it is always
 * `now − session.starts_at`. That single rule gives us the join-late seek, the
 * correction after a tab is throttled or backgrounded, and the seek lockout,
 * because any manual scrub is just drift and gets pulled straight back.
 */
export function useVideoProgress({
  videoRef,
  startsAt,
  durationSeconds,
  clockOffsetMs,
  onProgress,
}: Options) {
  const [currentTime, setCurrentTime] = useState(0);
  const [ended, setEnded] = useState(false);
  const watched = useRef(0);
  const lastReport = useRef(0);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    if (!startsAt) return;

    const startMs = new Date(startsAt).getTime();

    const tick = () => {
      const expected = (Date.now() + clockOffsetMs - startMs) / 1000;

      if (expected >= durationSeconds) {
        setCurrentTime(durationSeconds);
        setEnded(true);
        return;
      }

      const video = videoRef.current;
      if (!video || Number.isNaN(video.duration)) {
        setCurrentTime((previous) => Math.max(previous, expected, 0));
        return;
      }

      if (Math.abs(video.currentTime - expected) > DRIFT_TOLERANCE_SECONDS) {
        video.currentTime = Math.max(0, expected);
      }

      // Monotonic on the way out: the element's own clock can sit a little
      // behind `expected` between ticks, and consumers that fire once a
      // threshold passes — the offer reveal, the timed comments — must not see
      // it cross back.
      setCurrentTime((previous) => Math.max(previous, video.currentTime));
      watched.current += 1;

      if (watched.current - lastReport.current >= PROGRESS_INTERVAL_SECONDS) {
        lastReport.current = watched.current;
        const percentage = Math.min(
          100,
          Number(((video.currentTime / durationSeconds) * 100).toFixed(2))
        );
        onProgressRef.current?.(watched.current, percentage);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [videoRef, startsAt, durationSeconds, clockOffsetMs]);

  return {
    currentTime,
    duration: durationSeconds,
    percentage: durationSeconds
      ? Math.min(100, (currentTime / durationSeconds) * 100)
      : 0,
    ended,
  };
}
