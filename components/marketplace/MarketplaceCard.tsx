import Link from "next/link";
import { Star } from "lucide-react";

import type { Listing } from "@/hooks/useMarketplace";

const CATEGORY_LABELS: Record<string, string> = {
  webinar_template: "Webinar Template",
  persona_pack: "Persona Pack",
  comment_script: "Comment Script",
  email_sequence: "Email Sequence",
  registration_page: "Registration Page",
  offer_page: "Offer Page",
  ai_prompt: "AI Prompt",
  webinar_script: "Webinar Script",
};

export function MarketplaceCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/marketplace/listing/${listing.id}`}
      className="group block overflow-hidden rounded-2xl border border-[#1E1E2E] bg-[#12121A] transition-colors hover:border-[#6C47FF]/40"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0D0D15]">
        {listing.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable seller-uploaded hosts
          <img
            src={listing.thumbnail_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {listing.is_featured && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-[#6C47FF] px-2 py-0.5 text-[10px] font-semibold text-white">
            Featured
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-[10.5px] uppercase tracking-[0.1em] text-[#6E6E80]">
          {CATEGORY_LABELS[listing.category] ?? listing.category}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[14px] font-medium text-white">
          {listing.title}
        </h3>

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[15px] font-semibold text-white">
            {listing.price > 0
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: listing.currency || "USD",
                  minimumFractionDigits: 0,
                }).format(listing.price)
              : "Free"}
          </span>

          {listing.review_count > 0 && (
            <span className="flex items-center gap-1 text-[12px] text-[#A0A0B0]">
              <Star className="h-3 w-3 fill-[#F5A623] text-[#F5A623]" />
              {listing.average_rating.toFixed(1)}
              <span className="text-[#6E6E80]">({listing.review_count})</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
