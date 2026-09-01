import { GlassPanel } from "@/components/ui/glass-panel";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <GlassPanel className="flex flex-col items-center px-8 py-16 text-center">
      <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
        {body}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </GlassPanel>
  );
}
