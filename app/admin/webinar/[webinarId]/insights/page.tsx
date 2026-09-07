import type { Metadata } from "next";

import { AiInsightsFeed } from "@/components/intelligence/AiInsightsFeed";

export const metadata: Metadata = { title: "AI Insights" };

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <AiInsightsFeed webinarId={webinarId} />;
}
