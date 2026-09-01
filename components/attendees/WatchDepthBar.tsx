import { watchDepthColour } from "@/lib/segments";
import { cn, formatOffset } from "@/lib/utils";

export function WatchDepthBar({
  percentage,
  watchSeconds,
  totalSeconds,
  className,
}: {
  percentage: number;
  watchSeconds?: number;
  totalSeconds?: number | null;
  className?: string;
}) {
  const value = Math.min(100, Math.max(0, Number(percentage) || 0));
  const colour = watchDepthColour(value);

  const tooltip =
    watchSeconds !== undefined && totalSeconds
      ? `Watched ${formatOffset(watchSeconds)} of ${formatOffset(totalSeconds)}`
      : `Watched ${value.toFixed(0)}%`;

  return (
    <span className={cn("flex items-center gap-2", className)} title={tooltip}>
      <span className="h-1.5 w-full min-w-[54px] overflow-hidden rounded-full bg-[#1E1E2E]">
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          style={{ width: `${value}%`, background: colour }}
        />
      </span>
      <span
        className="shrink-0 text-[11.5px] tabular-nums"
        style={{ color: value > 0 ? colour : "#A0A0B0" }}
      >
        {value.toFixed(0)}%
      </span>
    </span>
  );
}
