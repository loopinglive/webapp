import { SEGMENT_META, type Segment } from "@/lib/segments";
import { cn } from "@/lib/utils";

export function SegmentBadge({
  segment,
  className,
}: {
  segment: string;
  className?: string;
}) {
  const meta = SEGMENT_META[segment as Segment];
  if (!meta) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold",
        className
      )}
      style={{
        // 20 is the hex alpha the design calls for on the fill.
        background: `${meta.colour}20`,
        color: meta.colour,
        border: meta.outlined ? `1px solid ${meta.colour}` : "1px solid transparent",
      }}
    >
      {meta.label}
    </span>
  );
}
