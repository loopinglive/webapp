import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function DocsBreadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-faint">
      <Link href="/docs" className="hover:text-ink-muted">
        Docs
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3" aria-hidden />
          {item.href ? (
            <Link href={item.href} className="hover:text-ink-muted">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-ink-muted">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
