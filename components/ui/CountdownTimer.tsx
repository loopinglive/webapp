"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  /** ISO timestamp to count down to. */
  target: string;
  /** serverTime − device clock, in ms. */
  clockOffsetMs?: number;
  onComplete?: () => void;
  className?: string;
};

function split(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  return {
    hours: Math.floor(safe / 3600),
    minutes: Math.floor((safe % 3600) / 60),
    seconds: safe % 60,
  };
}

export function CountdownTimer({
  target,
  clockOffsetMs = 0,
  onComplete,
  className,
}: Props) {
  const targetMs = new Date(target).getTime();
  const [remaining, setRemaining] = useState(() =>
    Math.round((targetMs - (Date.now() + clockOffsetMs)) / 1000)
  );

  useEffect(() => {
    const tick = () => {
      const next = Math.round((targetMs - (Date.now() + clockOffsetMs)) / 1000);
      setRemaining(next);
      if (next <= 0) {
        clearInterval(id);
        onComplete?.();
      }
    };

    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
    // onComplete is intentionally not a dep: the parent redirects on fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs, clockOffsetMs]);

  const { hours, minutes, seconds } = split(remaining);

  return (
    <div className={cn("flex items-start justify-center gap-3 sm:gap-4", className)}>
      {[
        { value: hours, label: "hours" },
        { value: minutes, label: "minutes" },
        { value: seconds, label: "seconds" },
      ].map((unit, index) => (
        <div key={unit.label} className="flex items-start gap-3 sm:gap-4">
          {index > 0 && (
            <span className="pt-3 text-3xl font-light text-[#6C47FF]/40 sm:pt-5 sm:text-5xl">
              :
            </span>
          )}
          <div className="w-[88px] rounded-2xl border border-white/8 bg-[#12121A]/80 px-2 py-4 backdrop-blur-xl sm:w-[124px] sm:py-6">
            <div className="text-center text-4xl font-semibold tabular-nums tracking-[-0.04em] sm:text-6xl">
              {String(unit.value).padStart(2, "0")}
            </div>
            <div className="mt-2 text-center text-[9px] font-semibold uppercase tracking-[0.22em] text-[#A0A0B0] sm:text-[10px]">
              {unit.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
