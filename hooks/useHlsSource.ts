"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * Attaches an adaptive stream to a video element, and keeps it attached.
 *
 * Three paths, in order of preference:
 *
 * 1. Safari and iOS play HLS natively — setting `src` is enough, and using
 *    hls.js there would be slower and worse.
 * 2. Everywhere else, hls.js is loaded on demand. It is ~400KB, so it is
 *    imported dynamically rather than shipped to every page that renders a
 *    video element.
 * 3. If neither works, fall back to the progressive MP4. A webinar that plays
 *    at one bitrate beats a webinar that does not play.
 *
 * The point of all this is buffering: a single MP4 cannot step down when the
 * connection weakens, so it stalls — and a stall is what forces the playhead
 * correction that makes a recorded webinar look recorded.
 *
 * Recovery matters as much as the ladder itself. A dropped segment on hotel
 * wifi is ordinary, and a live stream survives it; a webinar that gives up on
 * the first one does not look live, it looks broken.
 */

/** How many times to retry one failure class before dropping down a rung. */
const MAX_RECOVERIES = 3;

/** Backoff between retries. Growing, so a dead source stops being hammered. */
const RETRY_DELAYS_MS = [500, 2000, 5000];

export type PlaybackHealth = "ok" | "recovering" | "failed";

/** What a viewer can ask for. `auto` is ABR deciding, which is the default. */
export type QualityChoice = "auto" | "low";

export function useHlsSource({
  videoRef,
  streamSrc,
  fallbackSrc,
  enabled = true,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  streamSrc: string | null;
  fallbackSrc: string;
  enabled?: boolean;
}) {
  const [health, setHealth] = useState<PlaybackHealth>("ok");
  const [quality, setQuality] = useState<QualityChoice>("auto");
  const [canChooseQuality, setCanChooseQuality] = useState(false);

  // The player instance, so a quality change can reach it without tearing the
  // stream down and restarting playback from the session clock.
  const hlsRef = useRef<{
    currentLevel: number;
    autoLevelEnabled: boolean;
    levels: unknown[];
  } | null>(null);

  // Retry bookkeeping lives in refs: it must survive re-renders without
  // causing them, and a state update here would restart the very effect that
  // owns the player.
  const networkRetries = useRef(0);
  const mediaRetries = useRef(0);
  const sourceRetries = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timers.current.push(id);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    networkRetries.current = 0;
    mediaRetries.current = 0;
    sourceRetries.current = 0;

    let cancelled = false;
    let instance: { destroy: () => void } | null = null;

    const markHealth = (next: PlaybackHealth) => {
      if (!cancelled) setHealth(next);
    };

    /*
     * The progressive path, with its own retry.
     *
     * This is where playback ends up when HLS is unavailable or has given up,
     * and it had no recovery at all: a 404 or a hard stall on the MP4 left the
     * player sitting on a frozen frame with nothing trying again.
     *
     * The cache-buster matters. A failed media response can be cached by the
     * browser or an intermediary, and re-setting an identical `src` will
     * cheerfully replay the failure without touching the network.
     */
    const attachProgressive = () => {
      if (cancelled) return;

      const attempt = sourceRetries.current;
      const separator = fallbackSrc.includes("?") ? "&" : "?";
      video.src = attempt === 0 ? fallbackSrc : `${fallbackSrc}${separator}retry=${attempt}`;
      video.load();
    };

    const onSourceError = () => {
      if (cancelled) return;

      if (sourceRetries.current >= MAX_RECOVERIES) {
        markHealth("failed");
        return;
      }

      const delay = RETRY_DELAYS_MS[sourceRetries.current] ?? 5000;
      sourceRetries.current += 1;
      markHealth("recovering");
      later(attachProgressive, delay);
    };

    // `error` fires on the element for a source that will not load at all.
    video.addEventListener("error", onSourceError);
    // Playing again after a stall means whatever went wrong is over.
    const onPlaying = () => {
      sourceRetries.current = 0;
      markHealth("ok");
    };
    video.addEventListener("playing", onPlaying);

    if (!enabled || !streamSrc) {
      attachProgressive();
      return () => {
        cancelled = true;
        video.removeEventListener("error", onSourceError);
        video.removeEventListener("playing", onPlaying);
        timers.current.forEach(clearTimeout);
        timers.current = [];
      };
    }

    // Safari: native HLS. Its own error handling is the element's, above.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamSrc;
      return () => {
        cancelled = true;
        video.removeEventListener("error", onSourceError);
        video.removeEventListener("playing", onPlaying);
        timers.current.forEach(clearTimeout);
        timers.current = [];
      };
    }

    (async () => {
      try {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (!Hls.isSupported()) {
          attachProgressive();
          return;
        }

        const hls = new Hls({
          // Keep a healthy buffer: this is a scheduled broadcast, not a live
          // edge, so there is no latency cost to buffering ahead.
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          // Start conservatively and let ABR climb, rather than opening at the
          // top rendition and stalling in the first ten seconds.
          startLevel: -1,
        });

        instance = hls;
        hlsRef.current = hls as unknown as typeof hlsRef.current;
        hls.loadSource(streamSrc);
        hls.attachMedia(video);

        /*
         * A quality control only makes sense once we know there is a choice.
         *
         * A stream with one rendition would otherwise offer a button that
         * changes nothing, which is worse than no button.
         */
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!cancelled) setCanChooseQuality(hls.levels.length > 1);
        });

        // A clean fragment means the trouble has passed; without this, three
        // scattered blips over an hour would exhaust the budget as surely as
        // three in a row.
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          networkRetries.current = 0;
          mediaRetries.current = 0;
          markHealth("ok");
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal || cancelled) return;

          const giveUp = () => {
            hls.destroy();
            instance = null;
            attachProgressive();
          };

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            if (networkRetries.current >= MAX_RECOVERIES) {
              giveUp();
              return;
            }
            const delay = RETRY_DELAYS_MS[networkRetries.current] ?? 5000;
            networkRetries.current += 1;
            markHealth("recovering");
            later(() => {
              if (!cancelled && instance) hls.startLoad();
            }, delay);
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            if (mediaRetries.current >= MAX_RECOVERIES) {
              giveUp();
              return;
            }
            mediaRetries.current += 1;
            markHealth("recovering");
            // Escalating repair: the swap is heavier and is only worth
            // reaching for once the cheap recovery has already failed.
            if (mediaRetries.current === 1) hls.recoverMediaError();
            else hls.swapAudioCodec();
            return;
          }

          giveUp();
        });
      } catch {
        if (!cancelled) attachProgressive();
      }
    })();

    return () => {
      cancelled = true;
      video.removeEventListener("error", onSourceError);
      video.removeEventListener("playing", onPlaying);
      timers.current.forEach(clearTimeout);
      timers.current = [];
      hlsRef.current = null;
      instance?.destroy();
    };
  }, [videoRef, streamSrc, fallbackSrc, enabled, later]);

  /**
   * Pin the stream to its lowest rendition, or hand it back to ABR.
   *
   * ABR is usually right, and it is wrong in one situation that matters: a
   * connection that is bad enough to stall but not bad enough to look bad, so
   * the algorithm keeps climbing back to a rendition it cannot sustain and the
   * viewer buffers every thirty seconds. Being able to say "just give me the
   * small one" fixes that, and nothing else will.
   *
   * Applied to the live instance rather than by reloading: a reload would
   * restart playback, and this room's playhead is tied to the session clock,
   * so restarting means a visible jump — the exact thing the whole engine
   * exists to avoid.
   */
  const chooseQuality = useCallback((choice: QualityChoice) => {
    setQuality(choice);
    const hls = hlsRef.current;
    if (!hls) return;

    if (choice === "auto") {
      hls.currentLevel = -1;
    } else {
      // Level 0 is the lowest bitrate in a manifest ordered by bandwidth.
      hls.currentLevel = 0;
    }
  }, []);

  return { health, quality, canChooseQuality, chooseQuality };
}
