import type { Metadata } from "next";
import { Suspense } from "react";

import { WebinarAnalytics } from "@/components/analytics/WebinarAnalytics";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;

  return (
    // The range lives in the URL, so this reads searchParams and must suspend.
    <Suspense fallback={<div className="h-[60dvh]" />}>
      <WebinarAnalytics webinarId={webinarId} />
    </Suspense>
  );
}
