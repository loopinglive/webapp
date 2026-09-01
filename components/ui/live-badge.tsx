import { cn } from "@/lib/utils";

export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-live/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-live",
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
      </span>
      Live
    </span>
  );
}
