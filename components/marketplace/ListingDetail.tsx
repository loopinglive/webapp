"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, Star } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { TemplateApplicator } from "@/components/marketplace/TemplateApplicator";

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  listing_type: string;
  price: number;
  currency: string;
  thumbnail_url: string | null;
  demo_url: string | null;
  average_rating: number;
  review_count: number;
  total_sales: number;
};

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

export function ListingDetail({ listingId }: { listingId: string }) {
  const toast = useToast();
  const [data, setData] = useState<{
    listing: Listing;
    seller: { display_name: string; bio: string | null } | null;
    reviews: Review[];
    owned: boolean;
  } | null>(null);
  const [buying, setBuying] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/marketplace/listing/${listingId}`, {
      cache: "no-store",
    });
    if (response.status === 404) {
      setNotFound(true);
      return;
    }
    if (response.ok) setData(await response.json());
  }, [listingId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function buy() {
    setBuying(true);
    const response = await fetch("/api/marketplace/listing/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    const payload = (await response.json()) as {
      url?: string;
      free?: boolean;
      error?: string;
    };
    setBuying(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not start checkout.");
      return;
    }
    if (payload.free) {
      toast.success("Added to your purchases.");
      await load();
      return;
    }
    if (payload.url) window.location.assign(payload.url);
  }

  if (notFound) {
    return <div className="px-6 py-16 text-center text-[13px] text-[#A0A0B0]">Not found.</div>;
  }
  if (!data) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  const { listing, seller, reviews, owned } = data;

  return (
    <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1fr_360px] lg:px-10">
      <div className="min-w-0 space-y-6">
        {listing.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.thumbnail_url}
            alt=""
            className="w-full rounded-2xl border border-[#1E1E2E] object-cover"
          />
        )}

        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-white">
            {listing.title}
          </h1>
          <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#C4C4D0]">
            {listing.description}
          </p>
        </div>

        <section>
          <h2 className="text-[13px] font-semibold text-white">
            Reviews {reviews.length > 0 && `(${reviews.length})`}
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-[#6E6E80]">No reviews yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-xl border border-[#1E1E2E] p-3.5">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-3 w-3 ${
                          index < review.rating
                            ? "fill-[#F5A623] text-[#F5A623]"
                            : "text-[#2A2A3A]"
                        }`}
                      />
                    ))}
                  </div>
                  {review.title && (
                    <p className="mt-1.5 text-[13px] font-medium text-white">{review.title}</p>
                  )}
                  {review.body && (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#A0A0B0]">
                      {review.body}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <p className="text-[26px] font-semibold text-white">
            {listing.price > 0
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: listing.currency || "USD",
                }).format(listing.price)
              : "Free"}
          </p>

          {owned ? (
            <TemplateApplicator listingId={listingId} listingType={listing.listing_type} />
          ) : (
            <button
              onClick={() => void buy()}
              disabled={buying}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#6C47FF] text-[13.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-60"
            >
              {buying && <Loader2 className="h-4 w-4 animate-spin" />}
              {listing.price > 0 ? "Buy now" : "Get it free"}
            </button>
          )}

          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-[#6E6E80]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure payment via Stripe
          </p>

          {listing.total_sales > 0 && (
            <p className="mt-2 text-[11.5px] text-[#6E6E80]">
              {listing.total_sales} {listing.total_sales === 1 ? "sale" : "sales"}
            </p>
          )}
        </div>

        {seller && (
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
            <p className="text-[11px] uppercase tracking-[0.1em] text-[#6E6E80]">Seller</p>
            <p className="mt-1 text-[14px] font-medium text-white">{seller.display_name}</p>
            {seller.bio && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#A0A0B0]">{seller.bio}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
