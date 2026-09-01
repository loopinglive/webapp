import type { Metadata } from "next";

import { WatchRoom } from "@/components/webinar/WatchRoom";

export const metadata: Metadata = { title: "Live now" };

export default async function WatchPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <WatchRoom webinarId={webinarId} />;
}
