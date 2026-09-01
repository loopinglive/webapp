import type { Metadata } from "next";

import { WebinarOverview } from "@/components/admin/webinar/WebinarOverview";

export const metadata: Metadata = { title: "Webinar overview" };

export default async function WebinarOverviewPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <WebinarOverview webinarId={webinarId} />;
}
