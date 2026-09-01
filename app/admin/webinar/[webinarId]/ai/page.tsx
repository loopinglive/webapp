import type { Metadata } from "next";

import { AIPersonaConfig } from "@/components/admin/ai-config/AIPersonaConfig";

export const metadata: Metadata = { title: "AI moderators" };

export default async function AiPersonasPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <AIPersonaConfig webinarId={webinarId} />;
}
