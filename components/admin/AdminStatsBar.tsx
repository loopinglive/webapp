"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, MessageSquare, Timer, Users } from "lucide-react";

import { formatOffset } from "@/lib/utils";

const POLL_MS = 10_000;

type Props = {
  webinarId: string;
  sessionId: string;
  startsAt: string;
  durationSeconds: number;
  total: number;
  replied: number;
  pending: number;
};

export function AdminStatsBar({
  webinarId,
  sessionId,
  startsAt,
  durationSeconds,
  total,
  replied,
  pending,
}: Props) {
  const [viewers, setViewers] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startMs = new Date(startsAt).getTime();
    const tick = () => setElapsed(Math.max(0, (Date.now() - startMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startsAt]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/webinar/${webinarId}/attendance?sessionId=${sessionId}`,
          { cache: "no-store" }
        );
        if (!response.ok || cancelled) return;
        const { viewers: count } = (await response.json()) as { viewers: number };
        setViewers(count);
      } catch {
        // Keep the last figure.
      }
    };

    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [webinarId, sessionId]);

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#1E1E2E] bg-[#1E1E2E] backdrop-blur-2xl sm:grid-cols-3 lg:grid-cols-5">
      <Stat
        icon={Users}
        label="Viewers"
        value={viewers === null ? "—" : viewers.toLocaleString()}
      />
      <Stat icon={MessageSquare} label="Messages" value={total.toLocaleString()} />
      <Stat
        icon={CheckCircle2}
        label="Replied"
        value={replied.toLocaleString()}
        tone="#00C851"
      />
      <Stat
        icon={Clock}
        label="Pending"
        value={pending.toLocaleString()}
        tone={pending > 0 ? "#FF3B3B" : undefined}
      />
      <Stat
        icon={Timer}
        label="Position"
        value={`${formatOffset(Math.min(elapsed, durationSeconds))}`}
        hint={`of ${formatOffset(durationSeconds)}`}
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="bg-[#12121A]/90 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className="mt-1.5 text-xl font-semibold tabular-nums tracking-[-0.02em] text-white"
        style={tone ? { color: tone } : undefined}
      >
        {value}
        {hint && (
          <span className="ml-1.5 text-[11px] font-normal text-[#A0A0B0]/70">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
