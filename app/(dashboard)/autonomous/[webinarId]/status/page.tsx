import type { Metadata } from "next";

import { GenerationPipeline } from "@/components/autonomous/GenerationPipeline";

export const metadata: Metadata = { title: "Generating…" };
export const dynamic = "force-dynamic";

export default async function AutonomousStatusPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <GenerationPipeline webinarId={webinarId} />;
}
