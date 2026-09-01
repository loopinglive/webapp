import type { Metadata } from "next";

import { TemplateList } from "@/components/automation/TemplateList";

export const metadata: Metadata = { title: "Message templates" };

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <TemplateList webinarId={webinarId} />;
}
