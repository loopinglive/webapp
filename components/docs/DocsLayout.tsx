import Link from "next/link";

import { DocsSearch } from "@/components/docs/DocsSearch";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import type { DocsPageSummary } from "@/lib/docs/queries";

export function DocsLayout({
  pages,
  activeSlug,
  breadcrumb,
  toc,
  children,
}: {
  pages: DocsPageSummary[];
  activeSlug?: string;
  breadcrumb: React.ReactNode;
  toc?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-void">
      <header className="sticky top-0 z-20 border-b border-hairline bg-void/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/docs" className="text-[14px] font-semibold tracking-tight text-ink">
            Loopinglive Docs
          </Link>
          <div className="flex-1 sm:max-w-xs">
            <DocsSearch />
          </div>
          <Link href="/dashboard" className="hidden text-[13px] text-ink-muted hover:text-ink sm:block">
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
        <DocsSidebar pages={pages} activeSlug={activeSlug} />
        <main id="main-content" className="min-w-0 flex-1">
          <div className="mb-6">{breadcrumb}</div>
          {children}
        </main>
        {toc}
      </div>
    </div>
  );
}
