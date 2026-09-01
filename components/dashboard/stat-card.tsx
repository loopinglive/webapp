import { GlassPanel } from "@/components/ui/glass-panel";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <GlassPanel className="p-6">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        {label}
      </span>
      <div className="mt-3 text-3xl font-semibold tabular-nums tracking-[-0.03em]">
        {value}
      </div>
      {hint && <p className="mt-1.5 text-[12.5px] text-ink-muted">{hint}</p>}
    </GlassPanel>
  );
}
