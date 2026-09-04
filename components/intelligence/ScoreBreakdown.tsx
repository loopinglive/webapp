"use client";

import type { ScoreContribution } from "@/lib/intelligence/scoring";

const UNAVAILABLE_LABELS: Record<string, string> = {
  privateMessageSent: "Private messages",
  handRaised: "Raised hands",
  emojiReactions: "Emoji reactions",
  surveyCompleted: "Exit survey",
  timeInWaitingRoomSeconds: "Waiting-room time",
};

/** What actually earned this attendee their score, plus what could not be measured yet. */
export function ScoreBreakdown({
  contributions,
  available,
}: {
  contributions: ScoreContribution[];
  available: Record<string, boolean>;
}) {
  const total = contributions.reduce((sum, item) => sum + item.points, 0) || 1;
  const missing = Object.entries(UNAVAILABLE_LABELS).filter(
    ([key]) => available[key] === false
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
          What earned the score
        </p>
        {contributions.length === 0 ? (
          <p className="text-[12.5px] text-[#6A6A80]">No engagement signals yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {contributions
              .slice()
              .sort((a, b) => b.points - a.points)
              .map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <span className="w-[130px] shrink-0 truncate text-[12px] text-[#C8C8D4]">
                    {item.label}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1A1A2A]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-[#6C47FF] to-[#00D4FF]"
                      style={{ width: `${Math.min((item.points / total) * 100, 100)}%` }}
                    />
                  </span>
                  <span className="w-9 shrink-0 text-right text-[11.5px] tabular-nums text-white">
                    +{item.points}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {missing.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
            Not measured on this deployment
          </p>
          <ul className="flex flex-col gap-1">
            {missing.map(([key, label]) => (
              <li key={key} className="text-[12px] text-[#6A6A80]">
                {label} — excluded, not scored as zero
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
