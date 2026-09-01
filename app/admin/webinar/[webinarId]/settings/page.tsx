import type { Metadata } from "next";

import { WebinarSettings } from "@/components/admin/webinar/WebinarSettings";

export const metadata: Metadata = { title: "Webinar settings" };

export default async function WebinarSettingsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <WebinarSettings webinarId={webinarId} />;
}
