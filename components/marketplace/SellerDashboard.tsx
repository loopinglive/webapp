"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Store } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { MarketplaceCard } from "@/components/marketplace/MarketplaceCard";
import type { Listing } from "@/hooks/useMarketplace";

type SellerProfile = {
  display_name: string;
  total_sales: number;
  total_earnings: number;
  average_rating: number;
};

type SellerState =
  | { status: "loading" }
  | { status: "not_a_seller" }
  | { status: "seller"; profile: SellerProfile; listings: Listing[] };

export function SellerDashboard() {
  const toast = useToast();
  const [state, setState] = useState<SellerState>({ status: "loading" });
  const [displayName, setDisplayName] = useState("");
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/marketplace/seller/dashboard", { cache: "no-store" });
    if (response.status === 404) {
      setState({ status: "not_a_seller" });
      return;
    }
    if (response.ok) {
      const payload = (await response.json()) as {
        profile: SellerProfile;
        listings: Listing[];
      };
      setState({ status: "seller", profile: payload.profile, listings: payload.listings });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function register() {
    if (!displayName.trim()) return;
    setRegistering(true);
    const response = await fetch("/api/marketplace/seller/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim() }),
    });
    setRegistering(false);
    if (!response.ok) {
      toast.error("Could not register.");
      return;
    }
    await load();
  }

  if (state.status === "loading") {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (state.status === "not_a_seller") {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <Store className="mx-auto h-8 w-8 text-[#6C47FF]" />
        <h1 className="mt-4 text-[20px] font-semibold text-white">Sell on the marketplace</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#A0A0B0]">
          Package a template, a persona pack, or a comment script and put it in
          front of every host on the platform. Loopinglive takes 20% of each
          sale.
        </p>
        <div className="mt-5 flex gap-2">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your seller name"
            className="h-10 flex-1 rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
          />
          <button
            onClick={() => void register()}
            disabled={registering || !displayName.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6C47FF] px-4 text-[13.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-50"
          >
            {registering && <Loader2 className="h-4 w-4 animate-spin" />}
            Start selling
          </button>
        </div>
        <p className="mt-3 text-[11px] text-[#6E6E80]">
          Payouts need a connected payment account, set up separately once you
          have a listing ready.
        </p>
      </div>
    );
  }

  const { profile, listings } = state;

  return (
    <div className="px-6 py-6 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
            {profile.display_name}
          </h1>
          <p className="mt-1 text-[13px] text-[#A0A0B0]">
            {profile.total_sales} sales ·{" "}
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "usd" }).format(
              profile.total_earnings
            )}{" "}
            earned
          </p>
        </div>
        <Link
          href="/marketplace/sell/new"
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[#6C47FF] px-3.5 text-[13px] font-medium text-white hover:bg-[#5B39E0]"
        >
          <Plus className="h-3.5 w-3.5" />
          New listing
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <MarketplaceCard key={listing.id} listing={listing} />
        ))}
        {listings.length === 0 && (
          <p className="text-[13px] text-[#6E6E80]">No listings yet.</p>
        )}
      </div>
    </div>
  );
}
