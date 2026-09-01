import type { Metadata } from "next";

import { WaitingRoom } from "@/components/webinar/WaitingRoom";

export const metadata: Metadata = { title: "Waiting room" };

export default async function WaitingRoomPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <WaitingRoom webinarId={webinarId} />;
}
