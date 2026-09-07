import type { Metadata } from "next";
import Link from "next/link";

import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { categoryToSlug } from "@/components/docs/DocsSidebar";
import { groupByCategory, listDocsPages } from "@/lib/docs/queries";

export const metadata: Metadata = { title: "Documentation" };
export const dynamic = "force-dynamic";

export default async function DocsHomePage() {
  const pages = await listDocsPages();
  const groups = groupByCategory(pages);

  return (
    <DocsLayout pages={pages} breadcrumb={<DocsBreadcrumb items={[]} />}>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink">Documentation</h1>
      <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">
        Everything on setting up a webinar, engagement features, automation,
        analytics, integrations, the API, and your account.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {Array.from(groups.entries()).map(([category, categoryPages]) => (
          <Link
            key={category}
            href={`/docs/${categoryToSlug(category)}`}
            className="rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:border-accent/40"
          >
            <h2 className="text-[15px] font-semibold text-ink">{category}</h2>
            <p className="mt-1.5 text-[12.5px] text-ink-faint">
              {categoryPages.length} {categoryPages.length === 1 ? "page" : "pages"}
            </p>
          </Link>
        ))}
      </div>
    </DocsLayout>
  );
}
