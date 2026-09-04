import type { Metadata } from "next";

import { CreateListingForm } from "@/components/marketplace/CreateListingForm";

export const metadata: Metadata = { title: "New listing · Marketplace" };
export const dynamic = "force-dynamic";

export default function NewListingPage() {
  return <CreateListingForm />;
}
