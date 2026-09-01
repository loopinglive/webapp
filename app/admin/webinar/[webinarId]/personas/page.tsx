import type { Metadata } from "next";

import { PersonaBuilder } from "@/components/admin/personas/PersonaBuilder";

export const metadata: Metadata = { title: "Fake personas" };

export default async function PersonasPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <PersonaBuilder webinarId={webinarId} />;
}
