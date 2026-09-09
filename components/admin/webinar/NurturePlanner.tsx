"use client";

import { useState } from "react";
import { Clock, Loader2, Play, Sparkles } from "lucide-react";

import { AdminButton } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { usePredictiveNurture, type NurtureSequence } from "@/hooks/usePredictiveNurture";

const TIER_COLOUR: Record<string, string> = {
  hot: "text-[#FF6B6B]",
  warm: "text-[#F5A623]",
  cold: "text-ink-muted",
};

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00 UTC`;
}

/**
 * Timing, not copy. Each lead gets a schedule built from the hours they
 * personally engage at; the host reviews the proposals and activates them.
 * Nothing sends while a sequence is still "proposed".
 */
export function NurturePlanner({ webinarId }: { webinarId: string }) {
  const { sequences, loading, working, generate, setStatus } = usePredictiveNurture(webinarId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const proposed = sequences.filter((sequence) => sequence.status === "proposed");
  const active = sequences.filter((sequence) => sequence.status === "active");

  async function runGenerate() {
    const result = await generate();
    setNotice(
      result.ok
        ? result.created === 0
          ? "Every lead already has a sequence."
          : `Built ${result.created} sequence${result.created === 1 ? "" : "s"}.`
        : (result.error ?? "Could not build sequences.")
    );
  }

  return (
    <>
      <SectionHeader
        title="Predictive Nurture"
        description="Per-lead follow-up timing, worked out from when each person actually engaged. You review before anything sends."
        action={
          <AdminButton onClick={() => void runGenerate()} disabled={working}>
            {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Build sequences
          </AdminButton>
        }
      />

      <div className="max-w-3xl space-y-5 px-6 py-8 lg:px-8">
        {notice && <p className="text-[12.5px] text-ink-muted">{notice}</p>}

        <div className="flex flex-wrap gap-3">
          <Stat label="Proposed" value={proposed.length} />
          <Stat label="Active" value={active.length} />
          <Stat label="Converted" value={sequences.filter((sequence) => sequence.converted).length} />
        </div>

        {proposed.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/8 px-4 py-3.5">
            <span className="text-[12.5px] text-ink">
              {proposed.length} sequence{proposed.length === 1 ? "" : "s"} waiting for your approval.
            </span>
            <AdminButton onClick={() => void setStatus("active")} disabled={working}>
              <Play className="h-3.5 w-3.5" />
              Activate all
            </AdminButton>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-[12.5px] text-ink-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading…
          </div>
        ) : sequences.length === 0 ? (
          <p className="py-8 text-center text-[12.5px] text-ink-faint">
            No sequences yet. Build them once the webinar has leads who didn&rsquo;t buy.
          </p>
        ) : (
          <div className="space-y-2">
            {sequences.slice(0, 60).map((sequence) => (
              <SequenceRow
                key={sequence.id}
                sequence={sequence}
                expanded={expanded === sequence.id}
                onToggle={() => setExpanded((current) => (current === sequence.id ? null : sequence.id))}
                onActivate={() => void setStatus("active", sequence.id)}
                onPause={() => void setStatus("paused", sequence.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-4 py-3">
      <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-faint">{label}</span>
      <span className="mt-1 block text-[18px] font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

function SequenceRow({
  sequence,
  expanded,
  onToggle,
  onActivate,
  onPause,
}: {
  sequence: NurtureSequence;
  expanded: boolean;
  onToggle: () => void;
  onActivate: () => void;
  onPause: () => void;
}) {
  const sent = sequence.touchpoints.filter((touchpoint) => touchpoint.sentAt).length;

  return (
    <div className="rounded-xl border border-hairline bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] text-ink">
              {sequence.registrants?.full_name || sequence.registrants?.email || "Lead"}
            </span>
            <span className={`text-[11px] uppercase ${TIER_COLOUR[sequence.sequence_type] ?? "text-ink-muted"}`}>
              {sequence.sequence_type}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
            <Clock className="h-3 w-3" />
            best at {hourLabel(sequence.optimal_contact_times?.[0] ?? 15)} · {sequence.preferred_channel} · {sent}/
            {sequence.touchpoints.length} sent
          </p>
        </button>

        <div className="ml-3 flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-surface-3 px-2 py-0.5 text-[10.5px] text-ink-muted">
            {sequence.status}
          </span>
          {sequence.status === "proposed" && (
            <button onClick={onActivate} className="h-7 rounded-full bg-accent px-3 text-[11px] font-medium text-white">
              Activate
            </button>
          )}
          {sequence.status === "active" && (
            <button onClick={onPause} className="h-7 rounded-full border border-surface-3 px-3 text-[11px] text-ink-muted">
              Pause
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-1.5 border-t border-hairline px-4 py-3">
          {sequence.touchpoints.map((touchpoint, index) => (
            <div key={index} className="flex items-start gap-3 rounded-lg bg-void px-3 py-2">
              <span className="mt-0.5 shrink-0 text-[11px] tabular-nums text-ink-faint">
                D+{touchpoint.dayOffset} {hourLabel(touchpoint.hour)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] text-ink">{touchpoint.intent}</span>
                <span className="mt-0.5 block text-[11px] text-ink-faint">
                  {touchpoint.channel}
                  {touchpoint.sentAt ? ` · sent ${new Date(touchpoint.sentAt).toLocaleDateString()}` : " · scheduled"}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
