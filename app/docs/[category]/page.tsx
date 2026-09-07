import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { listDocsPages } from "@/lib/docs/queries";

function toSlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const pages = await listDocsPages();
  const match = pages.find((page) => toSlug(page.category) === category);
  return { title: match?.category ?? "Documentation" };
}

export default async function DocsCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const pages = await listDocsPages();
  const categoryPages = pages.filter((page) => toSlug(page.category) === category);

  if (categoryPages.length === 0) notFound();

  const categoryName = categoryPages[0].category;

  return (
    <DocsLayout pages={pages} breadcrumb={<DocsBreadcrumb items={[{ label: categoryName }]} />}>
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">{categoryName}</h1>
      <ul className="mt-6 space-y-2">
        {categoryPages.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/docs/${category}/${page.slug}`}
              className="block rounded-xl border border-hairline bg-surface px-4 py-3 text-[14px] text-ink transition-colors hover:border-accent/40"
            >
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </DocsLayout>
  );
}
