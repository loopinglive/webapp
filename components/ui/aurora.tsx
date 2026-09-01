import { cn } from "@/lib/utils";

// Ambient background wash — two drifting colour fields over a fine grid.
export function Aurora({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute -top-1/3 left-1/2 h-[820px] w-[820px] -translate-x-1/2 rounded-full bg-accent/22 blur-[140px] animate-drift" />
      <div className="absolute -bottom-1/4 -right-1/4 h-[620px] w-[620px] rounded-full bg-cyan/12 blur-[150px] animate-drift [animation-delay:-6s]" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />
    </div>
  );
}
