"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Users } from "lucide-react";

import { cn, formatOffset } from "@/lib/utils";

const ANIMATIONS: Record<string, string> = {
  pulse: "animate-pulse-ring",
  glow: "animate-offer-glow",
  slide: "animate-rise",
  bounce: "animate-offer-bounce",
};

/**
 * A miniature of the room, so the host sees the button where viewers will.
 *
 * The countdown really counts and the animation really plays — the point is to
 * judge the thing in motion, not as a still.
 */
export function OfferButtonPreview({
  buttonText,
  buttonColour,
  animation,
  countdownEnabled,
  countdownMinutes,
  triggerSeconds,
}: {
  buttonText: string;
  buttonColour: string;
  animation: string;
  countdownEnabled: boolean;
  countdownMinutes: number;
  triggerSeconds: number;
}) {
  const [remaining, setRemaining] = useState(countdownMinutes * 60);
  const [lastMinutes, setLastMinutes] = useState(countdownMinutes);

  // Changing the duration restarts the preview clock.
  if (countdownMinutes !== lastMinutes) {
    setLastMinutes(countdownMinutes);
    setRemaining(countdownMinutes * 60);
  }

  useEffect(() => {
    if (!countdownEnabled) return;
    const id = setInterval(
      () => setRemaining((value) => (value <= 1 ? countdownMinutes * 60 : value - 1)),
      1000
    );
    return () => clearInterval(id);
  }, [countdownEnabled, countdownMinutes]);

  return (
    <div className="sticky top-6">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
        Live preview
      </p>

      <div className="overflow-hidden rounded-xl border border-[#1E1E2E] bg-[#0A0A0F]">
        <div className="flex items-center justify-between border-b border-[#1E1E2E] px-3 py-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3B3B]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#FF3B3B]">
            <span className="h-1 w-1 rounded-full bg-[#FF3B3B]" />
            Live
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[#A0A0B0]">
            <Users className="h-2.5 w-2.5" />
            847
          </span>
        </div>

        <div className="relative aspect-video bg-gradient-to-br from-[#6C47FF]/20 via-[#12121A] to-[#00D4FF]/10">
          <span className="absolute bottom-2 left-3 font-mono text-[10px] tabular-nums text-white/50">
            {formatOffset(triggerSeconds)}
          </span>
        </div>

        <div className="p-3">
          <button
            style={{ background: buttonColour, color: buttonColour }}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-full px-4",
              ANIMATIONS[animation] ?? ""
            )}
          >
            <span className="truncate text-[13px] font-semibold text-white">
              {buttonText || "Your button text"}
            </span>
            {countdownEnabled && (
              <span className="shrink-0 rounded-full bg-black/20 px-1.5 py-0.5 text-[11px] tabular-nums text-white">
                {formatOffset(remaining).replace(/^00:/, "")}
              </span>
            )}
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white" />
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-[#A0A0B0]">
        Appears at {formatOffset(triggerSeconds)} and stays for the rest of the
        session.
      </p>
    </div>
  );
}
