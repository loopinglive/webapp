import type { Metadata } from "next";

import { AdCreativeGenerator } from "@/components/intelligence/AdCreativeGenerator";

export const metadata: Metadata = { title: "Ad Creatives" };

export default async function AdCreativesPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <AdCreativeGenerator webinarId={webinarId} />;
}
