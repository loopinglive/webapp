import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

export type DocsPageSummary = {
  slug: string;
  title: string;
  category: string;
  subcategory: string | null;
  position: number;
};

export type DocsPage = DocsPageSummary & {
  content: string;
  updated_at: string;
};

/** The full nav tree — every published page, ordered for the sidebar. */
export async function listDocsPages(): Promise<DocsPageSummary[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("documentation_pages")
    .select("slug, title, category, subcategory, position")
    .eq("is_published", true)
    .order("category", { ascending: true })
    .order("position", { ascending: true });

  return data ?? [];
}

export async function getDocsPage(slug: string): Promise<DocsPage | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("documentation_pages")
    .select("slug, title, content, category, subcategory, position, updated_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return data;
}

export async function listDocsCategory(category: string): Promise<DocsPageSummary[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("documentation_pages")
    .select("slug, title, category, subcategory, position")
    .eq("category", category)
    .eq("is_published", true)
    .order("position", { ascending: true });

  return data ?? [];
}

export function groupByCategory(pages: DocsPageSummary[]): Map<string, DocsPageSummary[]> {
  const groups = new Map<string, DocsPageSummary[]>();
  for (const page of pages) {
    const list = groups.get(page.category) ?? [];
    list.push(page);
    groups.set(page.category, list);
  }
  return groups;
}
