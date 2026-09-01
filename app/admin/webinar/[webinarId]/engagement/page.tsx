import type { Metadata } from "next";

import { EngagementPanel } from "@/components/admin/engagement/EngagementPanel";

export const metadata: Metadata = { title: "Engagement" };

export default async function EngagementPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <EngagementPanel webinarId={webinarId} />;
}
