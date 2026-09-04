import type { Metadata } from "next";

import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser";

export const metadata: Metadata = { title: "Marketplace" };
export const dynamic = "force-dynamic";

export default function MarketplacePage() {
  return <MarketplaceBrowser />;
}
