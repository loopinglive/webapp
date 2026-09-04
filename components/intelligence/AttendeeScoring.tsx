"use client";

import { Loader2, RefreshCw } from "lucide-react";

import { SectionHeader, useSetupContext } from "@/components/admin/webinar/WebinarSetupShell";
import { ScoringLeaderboard } from "@/components/intelligence/ScoringLeaderboard";
import { useAttendeeScoring } from "@/hooks/useAttendeeScoring";
import { cn } from "@/lib/utils";

export function AttendeeScoring({ webinarId }: { webinarId: string }) {
  const { webinar } = useSetupContext();
  const { rows, summary, loading, rescoring, error, rescoreAll, rescoreOne } =
    useAttendeeScoring(webinarId);

  return (
    <>
      <SectionHeader
        title="Attendee Scoring"
        description={`Who from "${webinar?.title ?? "this webinar"}" is worth a follow-up, ranked by engagement.`}
        action={
          <button
            onClick={() => void rescoreAll()}
            disabled={rescoring}
            className="flex h-9 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[12.5px] font-semibold text-white shadow-[0_10px_30px_-10px_#6C47FF] transition-colors hover:bg-[#7C5AFF] disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", rescoring && "animate-spin")} />
            {rescoring ? "Rescoring…" : "Rescore all attendees"}
          </button>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : (
          <>
            {error && (
              <p className="mb-4 text-[12.5px] text-[#FF3B3B]">{error}</p>
            )}

            {summary && (
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile label="Unconverted leads" value={summary.total} />
                <Tile label="Hot (80+)" value={summary.hot} tone="#FF3B3B" />
                <Tile label="Warm (60–79)" value={summary.warm} tone="#FF9500" />
                <Tile label="Average score" value={summary.averageScore} />
              </div>
            )}

            <ScoringLeaderboard rows={rows ?? []} onRescoreOne={rescoreOne} />
          </>
        )}
      </div>
    </>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
        {label}
      </p>
      <p
        className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em]"
        style={{ color: tone ?? "#FFFFFF" }}
      >
        {value}
      </p>
    </div>
  );
}
