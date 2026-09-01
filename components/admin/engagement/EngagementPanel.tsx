"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, MessageSquare, MousePointerClick, Vote } from "lucide-react";

import { CTABuilder } from "@/components/admin/engagement/CTABuilder";
import { HandoutUploader } from "@/components/admin/engagement/HandoutUploader";
import { PinnedMessageBuilder } from "@/components/admin/engagement/PinnedMessageBuilder";
import { PollBuilder } from "@/components/admin/engagement/PollBuilder";
import {
  SectionHeader,
  useSetupContext,
} from "@/components/admin/webinar/WebinarSetupShell";
import { cn } from "@/lib/utils";
import type {
  EngagementKind,
  TimedCta,
  TimedHandout,
  TimedPinnedMessage,
  TimedPoll,
} from "@/types";

const TABS: { id: EngagementKind; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "poll", label: "Polls", icon: Vote },
  { id: "handout", label: "Handouts", icon: FileText },
  { id: "cta", label: "CTAs", icon: MousePointerClick },
  { id: "pinned", label: "Pinned messages", icon: MessageSquare },
];

export type EngagementData = {
  polls: TimedPoll[];
  handouts: TimedHandout[];
  ctas: TimedCta[];
  pinned: TimedPinnedMessage[];
};

export function EngagementPanel({ webinarId }: { webinarId: string }) {
  const { webinar } = useSetupContext();
  const [tab, setTab] = useState<EngagementKind>("poll");
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  const duration = webinar?.video_duration_seconds ?? 0;

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/engagement`, {
      cache: "no-store",
    });
    if (response.ok) setData((await response.json()) as EngagementData);
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const counts: Record<EngagementKind, number> = {
    poll: data?.polls.length ?? 0,
    handout: data?.handouts.length ?? 0,
    cta: data?.ctas.length ?? 0,
    pinned: data?.pinned.length ?? 0,
  };

  return (
    <>
      <SectionHeader
        title="Engagement"
        description="Polls, handouts, CTAs and pinned messages, dropped on the video's clock."
      />

      <div className="px-6 py-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-[#2A2A3A] bg-[#1A1A2A] p-1">
          {TABS.map((option) => (
            <button
              key={option.id}
              onClick={() => setTab(option.id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] transition-colors duration-200",
                tab === option.id
                  ? "bg-[#6C47FF] text-white"
                  : "text-[#A0A0B0] hover:text-white"
              )}
            >
              <option.icon className="h-3.5 w-3.5" />
              {option.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  tab === option.id ? "bg-white/20" : "bg-white/5"
                )}
              >
                {counts[option.id]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 max-w-3xl">
          {loading || !data ? (
            <div className="grid place-items-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
            </div>
          ) : tab === "poll" ? (
            <PollBuilder
              webinarId={webinarId}
              duration={duration}
              polls={data.polls}
              onChanged={load}
            />
          ) : tab === "handout" ? (
            <HandoutUploader
              webinarId={webinarId}
              duration={duration}
              handouts={data.handouts}
              onChanged={load}
            />
          ) : tab === "cta" ? (
            <CTABuilder
              webinarId={webinarId}
              duration={duration}
              ctas={data.ctas}
              onChanged={load}
            />
          ) : (
            <PinnedMessageBuilder
              webinarId={webinarId}
              duration={duration}
              messages={data.pinned}
              onChanged={load}
            />
          )}
        </div>
      </div>
    </>
  );
}

/** Shared row chrome for every engagement list. */
export function EngagementRow({
  timestamp,
  children,
  onDelete,
}: {
  timestamp: string;
  children: React.ReactNode;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-start gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3">
      <span className="shrink-0 pt-0.5 font-mono text-[11.5px] tabular-nums text-[#6C47FF]">
        {timestamp}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      <button
        onClick={onDelete}
        aria-label="Delete"
        className="shrink-0 text-[#A0A0B0] opacity-0 transition-opacity hover:text-[#FF3B3B] group-hover:opacity-100"
      >
        ✕
      </button>
    </li>
  );
}
