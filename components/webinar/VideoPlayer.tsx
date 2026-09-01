"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Loader2, Volume2 } from "lucide-react";

import { formatOffset } from "@/lib/utils";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  poster?: string | null;
  currentTime: number;
  duration: number;
  ended: boolean;
};

export function VideoPlayer({
  videoRef,
  src,
  poster,
  currentTime,
  duration,
  ended,
}: Props) {
  const [needsSound, setNeedsSound] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const started = useRef(false);

  // Browsers only allow unprompted playback when muted. Try with sound, fall
  // back to muted, and put one tap between the viewer and audio.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || started.current) return;
    started.current = true;

    const start = async () => {
      try {
        video.muted = false;
        await video.play();
        setNeedsSound(false);
      } catch {
        video.muted = true;
        try {
          await video.play();
        } catch {
          // Autoplay blocked entirely; the sound prompt doubles as a play button.
        }
        setNeedsSound(true);
      }
    };

    void start();
  }, [videoRef]);

  async function enableSound() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    try {
      await video.play();
    } catch {
      // Ignore — the gesture that got us here already satisfied the policy.
    }
    setNeedsSound(false);
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black lg:rounded-xl">
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        playsInline
        preload="auto"
        // Fake-live: no scrubbing, no speed, no download. The playhead is owned
        // by the session clock in useVideoProgress.
        controls={false}
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        onContextMenu={(event) => event.preventDefault()}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        className="h-full w-full object-contain"
      />

      {buffering && !ended && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40">
          <Loader2 className="h-7 w-7 animate-spin text-white/80" />
        </div>
      )}

      {needsSound && !ended && (
        <button
          onClick={enableSound}
          className="absolute inset-x-0 bottom-0 top-0 z-20 grid place-items-center bg-black/45 backdrop-blur-[2px]"
        >
          <span className="flex items-center gap-2.5 rounded-full bg-[#6C47FF] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_48px_-12px_#6C47FF] animate-pulse-ring">
            <Volume2 className="h-4.5 w-4.5" />
            Tap for sound
          </span>
        </button>
      )}

      {ended && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#0A0A0F]/92 px-6 text-center backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">
              The webinar has ended
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-[#A0A0B0]">
              Thanks for watching. Keep an eye on your inbox — we will send the
              replay link shortly.
            </p>
          </div>
        </div>
      )}

      {/* Elapsed time. No scrub bar: there is nothing to scrub to. */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-[11.5px] font-medium tabular-nums text-white/70">
        <span>{formatOffset(Math.min(currentTime, duration))}</span>
        <span>{formatOffset(duration)}</span>
      </div>
    </div>
  );
}
