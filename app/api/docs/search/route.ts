import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function excerptAround(content: string, query: string, length = 140): string {
  const index = content.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return content.slice(0, length).trim() + "…";
  const start = Math.max(0, index - 40);
  return (start > 0 ? "…" : "") + content.slice(start, start + length).trim() + "…";
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ results: [] });

  // Two plain ilike queries rather than a single .or() with the term
  // interpolated into the filter string — PostgREST's filter syntax treats
  // comma and parentheses as structural, and this endpoint is unauthenticated.
  const supabase = createServiceClient();
  const [{ data: byTitle }, { data: byContent }] = await Promise.all([
    supabase
      .from("documentation_pages")
      .select("slug, title, category, content")
      .eq("is_published", true)
      .ilike("title", `%${query}%`)
      .limit(12),
    supabase
      .from("documentation_pages")
      .select("slug, title, category, content")
      .eq("is_published", true)
      .ilike("content", `%${query}%`)
      .limit(12),
  ]);

  const bySlug = new Map<string, { slug: string; title: string; category: string; content: string }>();
  for (const page of [...(byTitle ?? []), ...(byContent ?? [])]) {
    bySlug.set(page.slug, page);
  }

  const results = Array.from(bySlug.values())
    .slice(0, 12)
    .map((page) => ({
      slug: page.slug,
      title: page.title,
      category: page.category,
      excerpt: excerptAround(page.content, query),
    }));

  return NextResponse.json({ results });
}
