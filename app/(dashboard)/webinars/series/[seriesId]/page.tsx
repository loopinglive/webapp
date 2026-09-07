import type { Metadata } from "next";

import { SeriesBuilder } from "@/components/webinar-series/SeriesBuilder";

export const metadata: Metadata = { title: "Series builder" };

export default async function SeriesBuilderPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  return <SeriesBuilder seriesId={seriesId} />;
}
