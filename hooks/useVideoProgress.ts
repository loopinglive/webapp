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

/**
 * Drift bands.
 *
 * Under CATCH_UP we do nothing — a second of slop is invisible. Between
 * CATCH_UP and HARD_SEEK we nudge the playback rate and let the gap close
 * itself over a few seconds. Only past HARD_SEEK do we jump, because at that
 * point no amount of nudging would catch up before the moment has passed.
 */
const CATCH_UP_SECONDS = 1.5;
const HARD_SEEK_SECONDS = 12;

/** 5% either way: fast enough to close a ten-second gap, slow enough to be inaudible. */
const CATCH_UP_RATE = 1.05;
const SLOW_DOWN_RATE = 0.95;

const PROGRESS_INTERVAL_SECONDS = 10;

/**
 * Pins the video to the session clock.
 *
 * The playhead is never "wherever the video got to" — it is always
 * `now − session.starts_at`. That single rule gives us the join-late seek, the
 * correction after a tab is throttled, and the seek lockout, because any
 * manual scrub is just drift and gets pulled straight back.
 *
 * The correction is deliberately gentle. A hard seek on every small gap is the
 * single most visible tell that a webinar is recorded: buffer on hotel wifi,
 * fall two seconds behind, and the speaker teleports. Live video does not do
 * that. Nudging the rate closes the same gap without anyone noticing.
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
  const [buffering, setBuffering] = useState(false);
  const [catchingUp, setCatchingUp] = useState(false);

  const watched = useRef(0);
  const lastReport = useRef(0);
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  // Buffering is worth surfacing: a live stream stalls too, so a spinner reads
  // as the network rather than as a paused file.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onPlaying);

    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onPlaying);
    };
  }, [videoRef]);

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

      const gap = expected - video.currentTime;
      const magnitude = Math.abs(gap);

      if (magnitude > HARD_SEEK_SECONDS) {
        // Too far gone to nudge — a long stall, a sleeping laptop, or a first
        // paint after joining late.
        video.currentTime = Math.max(0, expected);
        video.playbackRate = 1;
        setCatchingUp(false);
      } else if (magnitude > CATCH_UP_SECONDS) {
        // Behind: speed up slightly. Ahead: ease off. Either way the gap
        // closes over a few seconds instead of in one visible jump.
        video.playbackRate = gap > 0 ? CATCH_UP_RATE : SLOW_DOWN_RATE;
        setCatchingUp(true);
      } else if (video.playbackRate !== 1) {
        video.playbackRate = 1;
        setCatchingUp(false);
      }

      // Monotonic on the way out: the element's own clock can sit a little
      // behind `expected` between ticks, and consumers that fire once a
      // threshold passes — the offer reveal, the timed comments — must not see
      // it cross back.
      setCurrentTime((previous) => Math.max(previous, video.currentTime));

      // Watch time only accrues while they are actually watching. Counting
      // every tick regardless meant a backgrounded tab, a paused video and a
      // closed laptop all racked up watch seconds, which made every retention
      // curve optimistic.
      const watching =
        !video.paused &&
        !video.ended &&
        document.visibilityState === "visible" &&
        !buffering;

      if (watching) watched.current += 1;

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
  }, [videoRef, startsAt, durationSeconds, clockOffsetMs, buffering]);

  return {
    currentTime,
    duration: durationSeconds,
    percentage: durationSeconds
      ? Math.min(100, (currentTime / durationSeconds) * 100)
      : 0,
    ended,
    buffering,
    catchingUp,
  };
}
