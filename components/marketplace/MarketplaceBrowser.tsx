"use client";

import Link from "next/link";
import { Loader2, Search, Store } from "lucide-react";

import { MarketplaceCard } from "@/components/marketplace/MarketplaceCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMarketplace } from "@/hooks/useMarketplace";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "webinar_template", label: "Templates" },
  { id: "persona_pack", label: "Persona Packs" },
  { id: "comment_script", label: "Comment Scripts" },
  { id: "email_sequence", label: "Email Sequences" },
  { id: "registration_page", label: "Registration Pages" },
  { id: "offer_page", label: "Offer Pages" },
  { id: "ai_prompt", label: "AI Prompts" },
  { id: "webinar_script", label: "Webinar Scripts" },
];

export function MarketplaceBrowser() {
  const { listings, category, setCategory, sort, setSort, query, setQuery } =
    useMarketplace();

  return (
    <div className="px-6 py-6 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
            Marketplace
          </h1>
          <p className="mt-1 text-[13px] text-[#A0A0B0]">
            Launch your webinar faster with proven templates and packs.
          </p>
        </div>
        <Link
          href="/marketplace/sell"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-[#1E1E2E] px-3.5 text-[13px] text-white hover:border-[#6C47FF]/50"
        >
          <Store className="h-3.5 w-3.5" />
          Sell on the marketplace
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E6E80]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search listings"
            className="h-9 w-[220px] rounded-full border border-[#1E1E2E] bg-[#0D0D15] pl-9 pr-4 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
          />
        </div>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="h-9 rounded-full border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="popular">Most popular</option>
          <option value="rating">Highest rated</option>
          <option value="price_low">Price: low to high</option>
          <option value="price_high">Price: high to low</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {CATEGORIES.map((option) => (
          <button
            key={option.id}
            onClick={() => setCategory(option.id)}
            className={`h-8 rounded-full px-3 text-[12.5px] transition-colors ${
              category === option.id
                ? "bg-[#6C47FF] text-white"
                : "text-[#A0A0B0] hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!listings ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            icon="🛍️"
            title="Nothing here yet"
            description="Try a different category or search term."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <MarketplaceCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
