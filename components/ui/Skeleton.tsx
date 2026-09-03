import { cn } from "@/lib/utils";

/**
 * Shimmer placeholder.
 *
 * The shimmer is a moving gradient rather than a pulsing opacity, which reads
 * as "content arriving" instead of "something is broken". Honours
 * prefers-reduced-motion by falling back to a flat block.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        "relative overflow-hidden rounded-md bg-[#1A1A2A]",
        "motion-safe:after:absolute motion-safe:after:inset-0",
        "motion-safe:after:animate-[skeleton-sweep_1.5s_ease-in-out_infinite]",
        "motion-safe:after:bg-gradient-to-r motion-safe:after:from-transparent motion-safe:after:via-[#2A2A3A] motion-safe:after:to-transparent",
        className
      )}
    />
  );
}

/** A grid of webinar cards, matching the dashboard's real layout. */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5"
        >
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="mt-4 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Table rows, sized to the header they sit under. */
export function SkeletonRows({
  rows = 8,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="divide-y divide-[#1E1E2E] rounded-xl border border-[#1E1E2E]">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-3.5">
          {/* First column wider: it is almost always the name. */}
          {Array.from({ length: columns }, (_, column) => (
            <Skeleton
              key={column}
              className={column === 0 ? "h-3.5 flex-[2]" : "h-3.5 flex-1"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Chart placeholder with the axis furniture in place, so nothing shifts. */
export function SkeletonChart({ height = 240 }: { height?: number }) {
  return (
    <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="mt-2 h-3 w-56" />
      <Skeleton className="mt-5 w-full rounded-lg" style={{ height }} />
    </div>
  );
}

export function SkeletonTiles({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5"
        >
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-3 h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
