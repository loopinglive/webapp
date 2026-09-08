import type { Metadata } from "next";

import { AgentsManager } from "@/components/admin/webinar/AgentsManager";

export const metadata: Metadata = { title: "Follow-up Agents" };

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <AgentsManager webinarId={webinarId} />;
}
