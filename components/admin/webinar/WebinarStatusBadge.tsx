import { cn } from "@/lib/utils";
import type { WebinarStatus } from "@/types/database";

const STYLES: Record<
  WebinarStatus | "live",
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-[#3A3A4A]/40 text-[#A0A0B0]" },
  published: { label: "Published", className: "bg-[#00C851]/15 text-[#00C851]" },
  live: { label: "Live", className: "bg-[#FF3B3B]/15 text-[#FF3B3B]" },
};

export function WebinarStatusBadge({
  status,
  live,
  className,
}: {
  status: WebinarStatus;
  /** A session is running right now. */
  live?: boolean;
  className?: string;
}) {
  const style = STYLES[live ? "live" : status] ?? STYLES.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        style.className,
        className
      )}
    >
      {live && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF3B3B] opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF3B3B]" />
        </span>
      )}
      {style.label}
    </span>
  );
}
