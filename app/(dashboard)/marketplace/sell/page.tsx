import type { Metadata } from "next";

import { SellerDashboard } from "@/components/marketplace/SellerDashboard";

export const metadata: Metadata = { title: "Sell · Marketplace" };
export const dynamic = "force-dynamic";

export default function SellPage() {
  return <SellerDashboard />;
}
