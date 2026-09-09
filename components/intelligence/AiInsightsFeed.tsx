"use client";

import { Check, Loader2, Sparkles, X } from "lucide-react";

import { AdminButton } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { useAiInsights, type AiInsight } from "@/hooks/useAiInsights";
import { cn } from "@/lib/utils";

const PRIORITY_STYLE: Record<AiInsight["priority"], string> = {
  high: "border-l-[#FF3B3B] bg-[#FF3B3B]/[0.04]",
  medium: "border-l-[#FF9500] bg-[#FF9500]/[0.04]",
  low: "border-l-[#00C851] bg-[#00C851]/[0.04]",
};

const PRIORITY_LABEL: Record<AiInsight["priority"], string> = {
  high: "Needs attention",
  medium: "Worth a look",
  low: "Good to know",
};

export function AiInsightsFeed({ webinarId }: { webinarId: string }) {
  const { insights, loading, generating, generate, markRead, dismiss } = useAiInsights(webinarId);

  return (
    <>
      <SectionHeader
        title="AI Insights"
        description="Observations from this webinar's own numbers — funnel shifts, hot leads, test winners, better time slots."
        action={
          <AdminButton disabled={generating} onClick={() => void generate()}>
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? "Analysing…" : "Refresh insights"}
          </AdminButton>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : !insights || insights.length === 0 ? (
          <div className="grid h-32 place-items-center rounded-xl border border-dashed border-hairline text-[13px] text-ink-faint">
            Nothing to flag right now. Refresh after your next session or two.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                onClick={() => !insight.is_read && void markRead(insight.id)}
                className={cn(
                  "cursor-pointer rounded-xl border-l-[3px] border-y border-r border-y-[#1E1E2E] border-r-[#1E1E2E] bg-surface p-4",
                  PRIORITY_STYLE[insight.priority],
                  !insight.is_read && "ring-1 ring-inset ring-white/5"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                      {PRIORITY_LABEL[insight.priority]}
                    </span>
                    <p className="mt-1 text-[14px] font-semibold text-ink">{insight.title}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#C8C8D4]">{insight.body}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void dismiss(insight.id);
                    }}
                    className="shrink-0 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {insight.action_items.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {insight.action_items.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-[12px] text-ink-muted">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
