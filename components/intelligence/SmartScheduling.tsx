"use client";

import { Check, Loader2, RefreshCw } from "lucide-react";

import { AdminButton } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { useScheduleOptimisation } from "@/hooks/useScheduleOptimisation";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${period} UTC`;
}

export function SmartScheduling({ webinarId }: { webinarId: string }) {
  const { latest, loading, computing, compute, markApplied } = useScheduleOptimisation(webinarId);

  return (
    <>
      <SectionHeader
        title="Smart Scheduling"
        description="The days and times this webinar's own past sessions actually converted registrants into attendees."
        action={
          <AdminButton disabled={computing} onClick={() => void compute()}>
            {computing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {computing ? "Analysing…" : latest ? "Recompute" : "Analyse sessions"}
          </AdminButton>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : !latest ? (
          <div className="grid h-32 place-items-center rounded-xl border border-dashed border-hairline text-[13px] text-ink-faint">
            No recommendation yet. Run the analysis once this webinar has a few ended sessions.
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-[12.5px] text-ink-faint">
                Based on {latest.based_on_sessions} session{latest.based_on_sessions === 1 ? "" : "s"}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]",
                  (latest.confidence_score ?? 0) >= 60
                    ? "bg-[#00C851]/15 text-[#00C851]"
                    : (latest.confidence_score ?? 0) > 0
                      ? "bg-[#FF9500]/15 text-[#FF9500]"
                      : "bg-surface-3 text-ink-muted"
                )}
              >
                {latest.confidence_score ?? 0}% confidence
              </span>
              {latest.applied && (
                <span className="flex items-center gap-1 text-[11.5px] text-[#00C851]">
                  <Check className="h-3 w-3" />
                  Applied
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {latest.recommended_times.map((slot, index) => (
                <div key={index} className="rounded-xl border border-hairline bg-surface p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    #{index + 1}
                  </span>
                  <p className="mt-1.5 text-[15px] font-semibold text-ink">
                    {DAYS[slot.dayOfWeek]} · {formatHour(slot.hour)}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-faint">
                    {slot.source === "historical"
                      ? `${slot.attendanceRate}% of registrants attended`
                      : "Industry-standard slot — not enough history yet"}
                  </p>
                </div>
              ))}
            </div>

            {latest.analysis_data.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[12px] font-medium text-ink-muted">All observed slots</p>
                <div className="flex flex-col gap-1.5">
                  {[...latest.analysis_data]
                    .sort((a, b) => b.attendanceRate - a.attendanceRate)
                    .map((slot, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 text-[12px] text-[#C8C8D4]">
                          {DAYS[slot.dayOfWeek]} {formatHour(slot.hour)}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-accent to-cyan"
                            style={{ width: `${slot.attendanceRate}%` }}
                          />
                        </span>
                        <span className="w-16 shrink-0 text-right text-[11.5px] tabular-nums text-ink">
                          {slot.attendanceRate}%
                        </span>
                        <span className="w-20 shrink-0 text-right text-[10.5px] text-ink-faint">
                          {slot.sampleSessions} session{slot.sampleSessions === 1 ? "" : "s"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {!latest.applied && (
              <AdminButton variant="secondary" className="mt-5" onClick={() => void markApplied(latest.id)}>
                Mark as applied
              </AdminButton>
            )}
          </>
        )}
      </div>
    </>
  );
}
