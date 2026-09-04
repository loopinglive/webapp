import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Browse and search listings.
 *
 * No auth required — RLS already allows anon/authenticated to read approved,
 * active listings, and browsing is the one part of the marketplace that
 * should work for someone who has not signed in yet.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const sort = url.searchParams.get("sort") ?? "newest";
  const q = url.searchParams.get("q")?.trim();
  const featured = url.searchParams.get("featured") === "1";

  const supabase = createServiceClient();

  let query = supabase
    .from("marketplace_listings")
    .select("*")
    .eq("is_approved", true)
    .eq("is_active", true);

  if (category && category !== "all") query = query.eq("category", category);
  if (featured) query = query.eq("is_featured", true);
  if (q) query = query.ilike("title", `%${q}%`);

  switch (sort) {
    case "popular":
      query = query.order("total_sales", { ascending: false });
      break;
    case "rating":
      query = query.order("average_rating", { ascending: false });
      break;
    case "price_low":
      query = query.order("price", { ascending: true });
      break;
    case "price_high":
      query = query.order("price", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}
