"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Star, X } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  thumbnail_url: string | null;
  is_featured: boolean;
  seller_id: string;
};

export function MarketplaceReviewQueue() {
  const toast = useToast();
  const [status, setStatus] = useState<"pending" | "approved">("pending");
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/superadmin/marketplace?status=${status}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { listings: Listing[] };
      setListings(payload.listings);
    }
  }, [status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function act(listingId: string, action: string) {
    setBusy(listingId);
    const response = await fetch("/api/superadmin/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, action }),
    });
    setBusy(null);
    if (!response.ok) {
      toast.error("That did not work.");
      return;
    }
    toast.success("Done.");
    await load();
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-4 flex gap-1.5">
        {(["pending", "approved"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={`h-8 rounded-full px-3 text-[12.5px] capitalize transition-colors ${
              status === value ? "bg-[#6C47FF] text-white" : "text-[#A0A0B0] hover:text-white"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {!listings ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon="🛍️"
          title={status === "pending" ? "Nothing waiting" : "Nothing approved yet"}
          description={
            status === "pending"
              ? "No listings need review right now."
              : "Nothing has been approved yet."
          }
        />
      ) : (
        <ul className="space-y-2">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
            >
              {listing.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.thumbnail_url}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] text-white">{listing.title}</p>
                <p className="line-clamp-1 text-[11.5px] text-[#6E6E80]">
                  {listing.category} · ${listing.price}
                </p>
              </div>

              {status === "pending" ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => void act(listing.id, "approve")}
                    disabled={busy === listing.id}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#22C55E] px-3 text-[12px] font-medium text-black hover:bg-[#1FAF52] disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => void act(listing.id, "reject")}
                    disabled={busy === listing.id}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#1E1E2E] px-3 text-[12px] text-[#A0A0B0] hover:text-[#FF5A5A] disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => void act(listing.id, listing.is_featured ? "unfeature" : "feature")}
                  disabled={busy === listing.id}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12px] disabled:opacity-60 ${
                    listing.is_featured
                      ? "border-[#6C47FF] text-[#6C47FF]"
                      : "border-[#1E1E2E] text-[#A0A0B0] hover:text-white"
                  }`}
                >
                  <Star className="h-3.5 w-3.5" />
                  {listing.is_featured ? "Featured" : "Feature"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
