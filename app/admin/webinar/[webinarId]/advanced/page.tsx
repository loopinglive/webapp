import type { Metadata } from "next";

import { AdvancedSettings } from "@/components/admin/webinar/AdvancedSettings";

export const metadata: Metadata = { title: "Advanced" };

export default async function AdvancedPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <AdvancedSettings webinarId={webinarId} />;
}
