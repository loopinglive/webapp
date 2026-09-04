"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type Purchase = {
  id: string;
  listing_id: string;
  amount_paid: number;
  purchased_at: string;
  listing: { id: string; title: string; thumbnail_url: string | null; listing_type: string } | null;
};

export function MyPurchases() {
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch("/api/marketplace/my-purchases", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { purchases: Purchase[] } | null) => {
          if (payload) setPurchases(payload.purchases);
        });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!purchases) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 lg:px-10">
      <h1 className="text-[20px] font-semibold text-white">My purchases</h1>

      {purchases.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🧾"
            title="Nothing yet"
            description="What you buy from the marketplace shows up here."
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {purchases.map((purchase) => (
            <li
              key={purchase.id}
              className="flex items-center gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
            >
              {purchase.listing?.thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={purchase.listing.thumbnail_url}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/marketplace/listing/${purchase.listing_id}`}
                  className="text-[13.5px] text-white hover:text-[#6C47FF]"
                >
                  {purchase.listing?.title ?? "(removed)"}
                </Link>
                <p className="text-[11.5px] text-[#6E6E80]">
                  {new Date(purchase.purchased_at).toLocaleDateString()} ·{" "}
                  {purchase.amount_paid > 0
                    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "usd" }).format(
                        purchase.amount_paid
                      )
                    : "Free"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
