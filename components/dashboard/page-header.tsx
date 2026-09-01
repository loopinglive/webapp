export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/8 px-6 py-6 lg:px-10">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-[13.5px] text-ink-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
