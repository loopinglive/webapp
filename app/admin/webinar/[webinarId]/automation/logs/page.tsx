import type { Metadata } from "next";

import { MessageLogs } from "@/components/automation/MessageLogs";

export const metadata: Metadata = { title: "Delivery logs" };

export default async function LogsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <MessageLogs webinarId={webinarId} />;
}
