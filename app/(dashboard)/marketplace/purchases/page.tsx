import type { Metadata } from "next";

import { MyPurchases } from "@/components/marketplace/MyPurchases";

export const metadata: Metadata = { title: "My purchases · Marketplace" };
export const dynamic = "force-dynamic";

export default function PurchasesPage() {
  return <MyPurchases />;
}
