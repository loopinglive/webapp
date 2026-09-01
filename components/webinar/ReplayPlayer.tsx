"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";

import { OfferButton } from "@/components/webinar/OfferButton";
import { cn } from "@/lib/utils";
import type { WebinarOffer } from "@/types";

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];
const REPORT_EVERY_SECONDS = 10;

/**
 * The replay.
 *
 * Unlike the live room this is an ordinary video: it pauses, seeks and plays at
 * whatever speed suits. There is no chat and no personas — the simulated
 * audience only makes sense in a session that is pretending to be live.
 */
export function ReplayPlayer({
  token,
  webinarId,
  title,
  videoUrl,
  posterUrl,
  durationSeconds,
  expiresAt,
  offer,
}: {
  token: string;
  webinarId: string;
  title: string;
  videoUrl: string;
  posterUrl: string | null;
  durationSeconds: number;
  expiresAt: string;
  offer: WebinarOffer | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [remaining, setRemaining] = useState("");
  const lastReport = useRef(0);

  // Expiry countdown.
  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("expired");
        return;
      }
      const hours = Math.floor(ms / 3600_000);
      const minutes = Math.floor((ms % 3600_000) / 60_000);
      setRemaining(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  // Progress, reported at the same cadence as the live room.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime - lastReport.current < REPORT_EVERY_SECONDS) return;
      lastReport.current = video.currentTime;

      void fetch(`/api/replay/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watchSeconds: Math.round(video.currentTime),
          watchPercentage: durationSeconds
            ? Number(((video.currentTime / durationSeconds) * 100).toFixed(2))
            : 0,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [token, durationSeconds]);

  return (
    <main className="min-h-dvh bg-[#0A0A0F]">
      <header className="border-b border-[#1E1E2E] px-5 py-3.5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00D4FF]">
              Replay
            </p>
            <h1 className="truncate text-[15px] font-semibold text-white">
              {title}
            </h1>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1E1E2E] bg-[#12121A] px-3 py-1.5 text-[11.5px] text-[#A0A0B0]">
            <Clock className="h-3 w-3" />
            {remaining === "expired"
              ? "Expired"
              : `Replay expires in ${remaining}`}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-6">
        <div className="overflow-hidden rounded-xl border border-[#1E1E2E] bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl ?? undefined}
            controls
            controlsList="nodownload"
            disablePictureInPicture
            onContextMenu={(event) => event.preventDefault()}
            className="aspect-video w-full bg-black"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] text-[#A0A0B0]">Speed</span>
            {SPEEDS.map((option) => (
              <button
                key={option}
                onClick={() => {
                  setSpeed(option);
                  if (videoRef.current) videoRef.current.playbackRate = option;
                }}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                  speed === option
                    ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                    : "border-[#2A2A3A] text-[#A0A0B0] hover:text-white"
                )}
              >
                {option}×
              </button>
            ))}
          </div>

          <Link
            href={`/webinar/${webinarId}/register`}
            className="text-[12.5px] text-[#6C47FF] transition-colors hover:text-[#00D4FF]"
          >
            Register for the next live session →
          </Link>
        </div>

        {offer && (
          <div className="mt-5">
            <OfferButton
              offer={offer}
              webinarId={webinarId}
              registrantId={null}
              currentTime={currentTime}
              variant="desktop"
            />
          </div>
        )}
      </div>
    </main>
  );
}
