import type { Metadata } from "next";

import { OfferBuilder } from "@/components/admin/offer/OfferBuilder";

export const metadata: Metadata = { title: "Offer button" };

export default async function OfferPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <OfferBuilder webinarId={webinarId} />;
}
