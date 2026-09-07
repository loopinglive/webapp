import Link from "next/link";

import type { DocsPageSummary } from "@/lib/docs/queries";
import { groupByCategory } from "@/lib/docs/queries";
import { cn } from "@/lib/utils";

function toSlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function DocsSidebar({
  pages,
  activeSlug,
}: {
  pages: DocsPageSummary[];
  activeSlug?: string;
}) {
  const groups = groupByCategory(pages);

  return (
    <nav aria-label="Documentation" className="w-full lg:w-64 lg:shrink-0">
      <ul className="space-y-5">
        {Array.from(groups.entries()).map(([category, categoryPages]) => (
          <li key={category}>
            <Link
              href={`/docs/${toSlug(category)}`}
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-muted"
            >
              {category}
            </Link>
            <ul className="mt-2 space-y-0.5 border-l border-hairline pl-3">
              {categoryPages.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/docs/${toSlug(category)}/${page.slug}`}
                    aria-current={page.slug === activeSlug ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-[13px] transition-colors",
                      page.slug === activeSlug
                        ? "bg-accent/10 text-accent-soft"
                        : "text-ink-muted hover:text-ink"
                    )}
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { toSlug as categoryToSlug };
