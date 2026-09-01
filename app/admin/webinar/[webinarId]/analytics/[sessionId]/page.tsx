import type { Metadata } from "next";

import { SessionAnalytics } from "@/components/analytics/SessionAnalytics";

export const metadata: Metadata = { title: "Session analytics" };

export default async function SessionAnalyticsPage({
  params,
}: {
  params: Promise<{ webinarId: string; sessionId: string }>;
}) {
  const { webinarId, sessionId } = await params;
  return <SessionAnalytics webinarId={webinarId} sessionId={sessionId} />;
}
