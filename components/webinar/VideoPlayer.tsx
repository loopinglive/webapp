"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Loader2, Volume2 } from "lucide-react";

import { useHlsSource } from "@/hooks/useHlsSource";
import { formatOffset } from "@/lib/utils";

type TranslatedCaptionSegment = { start: number; end: number; text: string };

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  /** Adaptive HLS. Falls back to `src` where it cannot be played. */
  streamSrc?: string | null;
  /** WebVTT captions, if the video was transcribed on upload. */
  captionsSrc?: string | null;
  /** Languages a host has generated translated captions for — see /api/webinar/[webinarId]/captions. */
  webinarId?: string;
  translationLanguages?: string[];
  poster?: string | null;
  currentTime: number;
  duration: number;
  ended: boolean;
  /** True while the playhead is being eased back into sync. */
  catchingUp?: boolean;
};

/** English's own VTT transcript, plus any language a host generated translated captions for, cycled by one button. */
function useCaptionMode(translationLanguages: string[], hasEnglish: boolean) {
  const modes = [...(hasEnglish ? ["en"] : []), ...translationLanguages];
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("loopinglive_captions");
        if (saved === "on") setMode(hasEnglish ? "en" : (modes[0] ?? null));
        else if (saved && modes.includes(saved)) setMode(saved);
      } catch {
        /* private mode, or storage blocked */
      }
    }, 0);
    return () => clearTimeout(timer);
    // Deliberately mount-only, like the toggle it replaces: modes/hasEnglish
    // are derived from a prop that does not change after the player mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cycle() {
    const currentIndex = mode ? modes.indexOf(mode) : -1;
    const next = currentIndex + 1 >= modes.length ? null : modes[currentIndex + 1];
    setMode(next);
    try {
      localStorage.setItem("loopinglive_captions", next ?? "off");
    } catch {
      /* private mode */
    }
  }

  return { mode, cycle, modes };
}

export function VideoPlayer({
  videoRef,
  src,
  streamSrc,
  captionsSrc,
  webinarId,
  translationLanguages = [],
  poster,
  currentTime,
  duration,
  ended,
  catchingUp,
}: Props) {
  const [needsSound, setNeedsSound] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const { mode: captionMode, cycle: cycleCaptions, modes: captionModes } = useCaptionMode(translationLanguages, Boolean(captionsSrc));
  const [translatedSegments, setTranslatedSegments] = useState<Record<string, TranslatedCaptionSegment[]>>({});
  const [audioOnly, setAudioOnly] = useState(false);
  const started = useRef(false);
  const captionsOn = captionMode === "en";

  // Adaptive stream where possible, progressive MP4 where not. The `src`
  // attribute is deliberately absent below — this hook owns the source.
  const { health, quality, canChooseQuality, chooseQuality } = useHlsSource({
    videoRef,
    streamSrc: streamSrc ?? null,
    fallbackSrc: src,
  });

  // A translated language's captions are a fetched list of timed segments,
  // not a VTT track — pulled once per language and cached, since a webinar's
  // caption set never changes mid-playback.
  useEffect(() => {
    if (!captionMode || captionMode === "en" || !webinarId || translatedSegments[captionMode]) return;
    void fetch(`/api/webinar/${webinarId}/captions?lang=${captionMode}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { segments?: TranslatedCaptionSegment[] } | null) => {
        if (payload?.segments) {
          setTranslatedSegments((current) => ({ ...current, [captionMode]: payload.segments! }));
        }
      })
      .catch(() => {});
  }, [captionMode, webinarId, translatedSegments]);

  const activeTranslatedCaption =
    captionMode && captionMode !== "en"
      ? translatedSegments[captionMode]?.find((segment) => currentTime >= segment.start && currentTime < segment.end)
      : null;

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
        poster={poster ?? undefined}
        crossOrigin="anonymous"
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
      >
        {captionsSrc && captionsOn && (
          <track
            // Keyed so toggling remounts the element with `default` set,
            // instead of reaching into textTracks to change its mode.
            key="captions-on"
            kind="captions"
            src={captionsSrc}
            srcLang="en"
            label="English"
            default
          />
        )}
      </video>

      {activeTranslatedCaption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 z-10 flex justify-center px-6">
          <span className="max-w-[85%] rounded-md bg-black/75 px-3 py-1.5 text-center text-[14px] leading-snug text-white">
            {activeTranslatedCaption.text}
          </span>
        </div>
      )}

      {audioOnly && !ended && (
        <div className="absolute inset-0 grid place-items-center bg-[#0D0D15] px-6 text-center">
          <div>
            <Volume2 className="mx-auto h-6 w-6 text-[#6C47FF]" />
            <p className="mt-3 text-[14px] font-medium text-white">Audio only</p>
            <p className="mx-auto mt-1 max-w-[34ch] text-[12.5px] leading-relaxed text-[#A0A0B0]">
              Video is hidden to save bandwidth. The audio is still playing and
              you have not missed anything.
            </p>
          </div>
        </div>
      )}

      {(buffering || health === "recovering") && !ended && !audioOnly && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40">
          <div className="text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-white/80" />
            <p className="mt-2 text-[12px] text-white/70">Reconnecting…</p>
          </div>
        </div>
      )}

      {/*
        Every rung of the ladder has failed.
        
        Worth saying out loud rather than leaving a spinner turning forever: a
        spinner claims something is still being tried, and at this point
        nothing is. Reloading genuinely can help — it re-resolves the source
        and starts the retry budget over — so it is the one thing offered.
      */}
      {health === "failed" && !ended && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/75 px-6 text-center">
          <div>
            <p className="text-[14px] font-medium text-white">
              The stream dropped out.
            </p>
            <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-white/70">
              This is usually the connection rather than the broadcast. The
              session is still running.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-black hover:bg-white/90"
            >
              Reconnect
            </button>
          </div>
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

        <span className="pointer-events-auto flex items-center gap-3">
          {catchingUp && (
            <span className="text-white/50" title="Catching up to the live position">
              syncing
            </span>
          )}
          {/*
            Let someone pin the stream low.
            
            ABR is usually right and wrong in one case that matters: a
            connection bad enough to stall but not bad enough to look bad, so
            the algorithm keeps climbing back to a rendition it cannot sustain
            and the viewer buffers every thirty seconds. Nothing but saying
            "give me the small one" fixes that.
          */}
          {canChooseQuality && !audioOnly && (
            <button
              onClick={() => chooseQuality(quality === "low" ? "auto" : "low")}
              aria-pressed={quality === "low"}
              title={
                quality === "low"
                  ? "Lowest quality — tap for automatic"
                  : "Struggling? Pin the lowest quality"
              }
              className={
                quality === "low"
                  ? "rounded border border-white/70 px-1.5 text-[10px] font-bold text-white"
                  : "rounded border border-white/30 px-1.5 text-[10px] font-bold text-white/50 hover:text-white"
              }
            >
              {quality === "low" ? "LOW" : "AUTO"}
            </button>
          )}

          <button
            onClick={() => setAudioOnly((value) => !value)}
            aria-pressed={audioOnly}
            title={audioOnly ? "Show video" : "Audio only — saves bandwidth"}
            className={
              audioOnly
                ? "rounded border border-white/70 px-1.5 text-[10px] font-bold text-white"
                : "rounded border border-white/30 px-1.5 text-[10px] font-bold text-white/50 hover:text-white"
            }
          >
            AUDIO
          </button>

          {captionModes.length > 0 && (
            <button
              onClick={cycleCaptions}
              aria-pressed={captionMode !== null}
              title={
                captionMode
                  ? `Captions: ${captionMode === "en" ? "English" : captionMode} — tap to change`
                  : "Show captions"
              }
              className={
                captionMode
                  ? "rounded border border-white/70 px-1.5 text-[10px] font-bold text-white"
                  : "rounded border border-white/30 px-1.5 text-[10px] font-bold text-white/50 hover:text-white"
              }
            >
              {captionMode && captionMode !== "en" ? captionMode : "CC"}
            </button>
          )}
          <span>{formatOffset(duration)}</span>
        </span>
      </div>
    </div>
  );
}
