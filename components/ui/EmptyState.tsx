import { cn } from "@/lib/utils";

/**
 * The one empty state.
 *
 * Every list in the product uses this, so "nothing here" always looks
 * deliberate rather than like a page that failed to load. The description
 * should say what would put something here, not restate the title.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#23232F] bg-[#0F0F17] px-6 py-14 text-center",
        className
      )}
    >
      <span aria-hidden className="text-[30px] leading-none">
        {icon}
      </span>
      <h3 className="mt-4 text-[15.5px] font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-[13.5px] leading-relaxed text-[#6E6E80]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
