"use client";

import { useCallback, useEffect, useState } from "react";

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category: string;
  listing_type: string;
  price: number;
  currency: string;
  thumbnail_url: string | null;
  preview_url: string | null;
  demo_url: string | null;
  tags: string[];
  total_sales: number;
  average_rating: number;
  review_count: number;
  is_featured: boolean;
};

/** Browsing the marketplace: search, category, sort. */
export function useMarketplace() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ category, sort });
    if (query.trim()) params.set("q", query.trim());

    const response = await fetch(`/api/marketplace/listings?${params}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { listings: Listing[] };
      setListings(payload.listings);
    }
  }, [category, sort, query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  return { listings, category, setCategory, sort, setSort, query, setQuery, refresh: load };
}
