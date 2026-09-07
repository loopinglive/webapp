import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/page-header";
import { UpsellSequences } from "@/components/upsell/UpsellSequences";

export const metadata: Metadata = { title: "Upsell sequences" };

export default function UpsellPage() {
  return (
    <>
      <PageHeader
        title="Upsell sequences"
        subtitle="Automatically pitch a related webinar once someone finishes another."
      />
      <UpsellSequences />
    </>
  );
}
