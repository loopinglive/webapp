import type { Metadata } from "next";

import { SupportConversations } from "@/components/intelligence/SupportConversations";

export const metadata: Metadata = { title: "AI Support Chat" };

export default async function SupportChatPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <SupportConversations webinarId={webinarId} />;
}
