"use client";

import { useEffect, type RefObject } from "react";

/**
 * Attaches an adaptive stream to a video element.
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
 */
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
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!enabled || !streamSrc) {
      video.src = fallbackSrc;
      return;
    }

    // Safari: native HLS.
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamSrc;
      return;
    }

    let cancelled = false;
    let instance: { destroy: () => void } | null = null;

    (async () => {
      try {
        const { default: Hls } = await import("hls.js");
        if (cancelled || !Hls.isSupported()) {
          video.src = fallbackSrc;
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
        hls.loadSource(streamSrc);
        hls.attachMedia(video);

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          // One recovery attempt per fatal class, then give up and use the MP4.
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
            instance = null;
            video.src = fallbackSrc;
          }
        });
      } catch {
        if (!cancelled) video.src = fallbackSrc;
      }
    })();

    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [videoRef, streamSrc, fallbackSrc, enabled]);
}
