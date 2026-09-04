import type { Metadata } from "next";

import { ListingDetail } from "@/components/marketplace/ListingDetail";

export const metadata: Metadata = { title: "Listing · Marketplace" };
export const dynamic = "force-dynamic";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  return <ListingDetail listingId={listingId} />;
}
