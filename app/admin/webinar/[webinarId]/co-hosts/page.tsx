import type { Metadata } from "next";

import { CoHostManager } from "@/components/admin/webinar/CoHostManager";

export const metadata: Metadata = { title: "Co-hosts" };

export default async function CoHostsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <CoHostManager webinarId={webinarId} />;
}
