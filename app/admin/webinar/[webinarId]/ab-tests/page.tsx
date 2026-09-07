import type { Metadata } from "next";

import { AbTesting } from "@/components/intelligence/AbTesting";

export const metadata: Metadata = { title: "A/B Tests" };

export default async function AbTestsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <AbTesting webinarId={webinarId} />;
}
