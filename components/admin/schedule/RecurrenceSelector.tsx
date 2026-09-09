"use client";

import { RECURRENCE_PRESETS, WEEKDAY_CODES, type RecurrenceId } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export function RecurrenceSelector({
  recurring,
  onRecurringChange,
  pattern,
  onPatternChange,
  days,
  onDaysChange,
}: {
  recurring: boolean;
  onRecurringChange: (recurring: boolean) => void;
  pattern: RecurrenceId;
  onPatternChange: (pattern: RecurrenceId) => void;
  days: string[];
  onDaysChange: (days: string[]) => void;
}) {
  return (
    <div>
      <span className="text-[12px] font-medium text-ink-muted">Repeats</span>

      <div className="mt-2 flex items-center gap-1 rounded-full border border-surface-3 bg-surface-2 p-1">
        {[
          { id: false, label: "One time" },
          { id: true, label: "Recurring" },
        ].map((option) => (
          <button
            key={String(option.id)}
            type="button"
            onClick={() => onRecurringChange(option.id)}
            className={cn(
              "flex-1 rounded-full px-4 py-1.5 text-[12.5px] transition-colors duration-200",
              recurring === option.id
                ? "bg-accent text-white"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {recurring && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {RECURRENCE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPatternChange(preset.id)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors duration-200",
                  pattern === preset.id
                    ? "border-accent bg-accent/15 text-ink"
                    : "border-surface-3 text-ink-muted hover:border-accent/40 hover:text-ink"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {pattern === "weekly" && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {WEEKDAY_CODES.map((code) => {
                const on = days.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() =>
                      onDaysChange(
                        on
                          ? days.filter((day) => day !== code)
                          : [...days, code]
                      )
                    }
                    className={cn(
                      "h-9 w-11 rounded-lg border text-[11.5px] font-semibold transition-colors duration-200",
                      on
                        ? "border-accent bg-accent/15 text-ink"
                        : "border-surface-3 text-ink-muted hover:text-ink"
                    )}
                  >
                    {code[0] + code.slice(1, 3).toLowerCase()}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
