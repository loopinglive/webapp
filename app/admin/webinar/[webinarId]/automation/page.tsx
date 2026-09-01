import type { Metadata } from "next";

import { AutomationHub } from "@/components/automation/AutomationHub";

export const metadata: Metadata = { title: "Automation" };

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <AutomationHub webinarId={webinarId} />;
}
