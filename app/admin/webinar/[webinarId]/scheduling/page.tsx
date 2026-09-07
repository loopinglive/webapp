import type { Metadata } from "next";

import { SmartScheduling } from "@/components/intelligence/SmartScheduling";

export const metadata: Metadata = { title: "Smart Scheduling" };

export default async function SchedulingPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <SmartScheduling webinarId={webinarId} />;
}
