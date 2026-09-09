"use client";

import { cn } from "@/lib/utils";

/**
 * The shell every chart sits in: title, optional note, legend, and — the part
 * that matters — a real empty state that says *why* there is nothing to draw.
 *
 * A zero and an unknown are different facts, so `empty` takes a sentence rather
 * than falling back to a generic "No data".
 */
export function ChartFrame({
  title,
  note,
  legend,
  empty,
  action,
  children,
  className,
}: {
  title: string;
  note?: string;
  legend?: { label: string; colour: string }[];
  /** When set, the chart is replaced by this explanation. */
  empty?: string | null;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-hairline bg-surface p-5",
        className
      )}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h3>
          {note && (
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
              {note}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Two or more series always get a legend; identity is never colour alone. */}
          {legend && legend.length > 1 && (
            <ul className="flex flex-wrap items-center gap-3">
              {legend.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-1.5 text-[11.5px] text-ink-muted"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-[2px]"
                    style={{ background: item.colour }}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          )}
          {action}
        </div>
      </header>

      {empty ? (
        <div className="grid min-h-[180px] place-items-center rounded-lg border border-dashed border-surface-3 px-6 text-center">
          <p className="max-w-[280px] text-[12.5px] leading-relaxed text-ink-muted">
            {empty}
          </p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/** Shared tooltip shell so every chart hovers the same way. */
export function TooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; colour?: string }[];
}) {
  return (
    <div className="rounded-lg border border-surface-3 bg-surface px-3 py-2 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.9)]">
      <p className="text-[11px] text-ink-muted">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center gap-2 text-[12px] text-ink"
          >
            {row.colour && (
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: row.colour }}
              />
            )}
            <span className="text-ink-muted">{row.label}</span>
            <span className="ml-auto font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
