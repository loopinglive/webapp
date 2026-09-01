"use client";

import { useState } from "react";
import { ArrowUpRight, BarChart3, Check, Download, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PollOption, TimedCta, TimedHandout, TimedPoll } from "@/types";

type Props = {
  webinarId: string;
  sessionId: string | null;
  registrantId: string | null;
  poll: TimedPoll | null;
  cta: TimedCta | null;
  handouts: TimedHandout[];
  /** Pushes the stack above the sticky offer bar on mobile. */
  offerVisible: boolean;
};

/**
 * Everything the host scheduled to drop, stacked over the video.
 *
 * Bottom-left on desktop and bottom-centre on mobile, sitting above the offer
 * bar when one is showing so the two never fight for the same strip.
 */
export function EngagementLayer({
  webinarId,
  sessionId,
  registrantId,
  poll,
  cta,
  handouts,
  offerVisible,
}: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = (id: string) =>
    setDismissed((current) => new Set(current).add(id));

  const visibleHandouts = handouts.filter(
    (handout) => !dismissed.has(handout.id)
  );

  if (!poll && !cta && !visibleHandouts.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-30 flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2",
        "left-4 lg:left-6",
        offerVisible ? "bottom-[86px] lg:bottom-6" : "bottom-24 lg:bottom-6"
      )}
    >
      {visibleHandouts.map((handout) => (
        <HandoutCard
          key={handout.id}
          handout={handout}
          onDismiss={() => dismiss(handout.id)}
        />
      ))}

      {cta && !dismissed.has(cta.id) && (
        <CtaCard cta={cta} onDismiss={() => dismiss(cta.id)} />
      )}

      {poll && !dismissed.has(poll.id) && (
        <PollCard
          poll={poll}
          webinarId={webinarId}
          sessionId={sessionId}
          registrantId={registrantId}
          onDismiss={() => dismiss(poll.id)}
        />
      )}
    </div>
  );
}

function Shell({
  children,
  onDismiss,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div className="pointer-events-auto relative animate-rise rounded-xl border border-white/10 bg-[#12121A]/92 p-3.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white"
      >
        <X className="h-3 w-3" />
      </button>
      {children}
    </div>
  );
}

function HandoutCard({
  handout,
  onDismiss,
}: {
  handout: TimedHandout;
  onDismiss: () => void;
}) {
  return (
    <Shell onDismiss={onDismiss}>
      <p className="pr-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#00D4FF]">
        Resource
      </p>
      <a
        href={handout.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-2.5 rounded-lg bg-[#00D4FF]/10 px-3 py-2.5 transition-colors hover:bg-[#00D4FF]/20"
      >
        <Download className="h-4 w-4 shrink-0 text-[#00D4FF]" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">
          {handout.title}
        </span>
      </a>
    </Shell>
  );
}

function CtaCard({ cta, onDismiss }: { cta: TimedCta; onDismiss: () => void }) {
  return (
    <Shell onDismiss={onDismiss}>
      <a
        href={cta.button_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ background: cta.button_colour }}
        className="mt-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold text-white transition-[filter] hover:brightness-110"
      >
        <span className="truncate">{cta.button_text}</span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
      </a>
    </Shell>
  );
}

function PollCard({
  poll,
  webinarId,
  sessionId,
  registrantId,
  onDismiss,
}: {
  poll: TimedPoll;
  webinarId: string;
  sessionId: string | null;
  registrantId: string | null;
  onDismiss: () => void;
}) {
  const [answered, setAnswered] = useState<string | null>(null);
  const [tally, setTally] = useState<Record<string, number> | null>(null);
  const [total, setTotal] = useState(0);

  const options = (poll.options as PollOption[]) ?? [];

  async function answer(optionId: string) {
    setAnswered(optionId);

    if (!sessionId || !registrantId) return;

    const response = await fetch(`/api/webinar/${webinarId}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pollId: poll.id,
        sessionId,
        registrantId,
        optionId,
      }),
    });

    if (!response.ok) return;
    const payload = (await response.json()) as {
      tally: Record<string, number>;
      total: number;
    };
    setTally(payload.tally);
    setTotal(payload.total);
  }

  return (
    <Shell onDismiss={onDismiss}>
      <p className="flex items-center gap-1.5 pr-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6C47FF]">
        <BarChart3 className="h-3 w-3" />
        Quick poll
      </p>
      <p className="mt-2 text-[13.5px] font-medium leading-snug text-white">
        {poll.question}
      </p>

      <div className="mt-3 space-y-1.5">
        {options.map((option) => {
          const chosen = answered === option.id;
          const share =
            tally && total ? Math.round(((tally[option.id] ?? 0) / total) * 100) : null;

          return (
            <button
              key={option.id}
              onClick={() => answer(option.id)}
              disabled={Boolean(answered)}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors",
                chosen
                  ? "border-[#6C47FF] text-white"
                  : "border-[#2A2A3A] text-[#A0A0B0]",
                !answered && "hover:border-[#6C47FF]/60 hover:text-white"
              )}
            >
              {share !== null && (
                <span
                  className="absolute inset-y-0 left-0 bg-[#6C47FF]/20 transition-[width] duration-500"
                  style={{ width: `${share}%` }}
                />
              )}
              <span className="relative flex items-center gap-2">
                {chosen && <Check className="h-3 w-3 shrink-0 text-[#6C47FF]" />}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {share !== null && (
                  <span className="shrink-0 tabular-nums">{share}%</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {answered && !registrantId && (
        <p className="mt-2 text-[11px] text-[#A0A0B0]">
          Register to have your answer counted.
        </p>
      )}
    </Shell>
  );
}
