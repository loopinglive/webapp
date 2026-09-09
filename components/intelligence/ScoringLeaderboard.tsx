"use client";

import { Fragment, useState } from "react";
import { ChevronDown, Flame, RefreshCw } from "lucide-react";

import { ConversionPrediction } from "@/components/intelligence/ConversionPrediction";
import { ScoreBreakdown } from "@/components/intelligence/ScoreBreakdown";
import type { ScoredRegistrant } from "@/hooks/useAttendeeScoring";
import { scoreLabel } from "@/lib/intelligence/scoring";
import { cn } from "@/lib/utils";

const LABEL_STYLE: Record<ReturnType<typeof scoreLabel>, string> = {
  hot: "bg-[#FF3B3B]/15 text-[#FF3B3B]",
  warm: "bg-[#FF9500]/15 text-[#FF9500]",
  engaged: "bg-cyan/15 text-cyan",
  cold: "bg-surface-3 text-ink-muted",
};

export function ScoringLeaderboard({
  rows,
  onRescoreOne,
}: {
  rows: ScoredRegistrant[];
  onRescoreOne: (registrantId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="grid h-40 place-items-center rounded-xl border border-dashed border-hairline text-[13px] text-ink-faint">
        No unconverted attendees have been scored yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-hairline bg-surface text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            <th className="px-4 py-3">Attendee</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Watched</th>
            <th className="px-4 py-3">Likely to buy</th>
            <th className="px-4 py-3">Churn risk</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const label = scoreLabel(row.engagement_score);
            const open = openId === row.registrant_id;
            const contributions = row.score_factors?.contributions ?? [];
            const available = row.score_factors?.available ?? {};

            return (
              <Fragment key={row.registrant_id}>
                <tr
                  onClick={() => setOpenId(open ? null : row.registrant_id)}
                  className="cursor-pointer border-b border-hairline text-[13px] transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">
                      {row.registrant?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-[11.5px] text-ink-faint">{row.registrant?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums",
                        LABEL_STYLE[label]
                      )}
                    >
                      {label === "hot" && <Flame className="h-3 w-3" />}
                      {row.engagement_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[#C8C8D4]">
                    {Math.round(row.registrant?.watch_percentage ?? 0)}%
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[#C8C8D4]">
                    {row.conversion_likelihood}%
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[#C8C8D4]">{row.churn_risk}%</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onRescoreOne(row.registrant_id);
                        }}
                        title="Rescore this attendee"
                        className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-ink-faint transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr className="border-b border-hairline bg-void">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
                        <ScoreBreakdown contributions={contributions} available={available} />
                        <ConversionPrediction
                          conversionLikelihood={row.conversion_likelihood}
                          churnRisk={row.churn_risk}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
