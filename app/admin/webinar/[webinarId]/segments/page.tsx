import type { Metadata } from "next";

import { SmartSegments } from "@/components/intelligence/SmartSegments";

export const metadata: Metadata = { title: "Smart Segments" };

export default async function SegmentsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <SmartSegments webinarId={webinarId} />;
}
