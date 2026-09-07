import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsBreadcrumb } from "@/components/docs/DocsBreadcrumb";
import { DocsContent } from "@/components/docs/DocsContent";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocsTableOfContents } from "@/components/docs/DocsTableOfContents";
import { getDocsPage, listDocsPages } from "@/lib/docs/queries";

function toSlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getDocsPage(slug);
  return { title: page?.title ?? "Documentation" };
}

export default async function DocsPageRoute({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const [page, pages] = await Promise.all([getDocsPage(slug), listDocsPages()]);

  if (!page || toSlug(page.category) !== category) notFound();

  return (
    <DocsLayout
      pages={pages}
      activeSlug={page.slug}
      breadcrumb={
        <DocsBreadcrumb
          items={[
            { label: page.category, href: `/docs/${category}` },
            { label: page.title },
          ]}
        />
      }
      toc={<DocsTableOfContents content={page.content} />}
    >
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">{page.title}</h1>
      <DocsContent content={page.content} />
    </DocsLayout>
  );
}
