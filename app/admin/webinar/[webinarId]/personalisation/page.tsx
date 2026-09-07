import type { Metadata } from "next";

import { PersonalisationRules } from "@/components/intelligence/PersonalisationRules";

export const metadata: Metadata = { title: "Personalisation" };

export default async function PersonalisationPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <PersonalisationRules webinarId={webinarId} />;
}
