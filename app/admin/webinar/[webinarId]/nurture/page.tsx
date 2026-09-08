import type { Metadata } from "next";

import { NurturePlanner } from "@/components/admin/webinar/NurturePlanner";

export const metadata: Metadata = { title: "Predictive Nurture" };

export default async function NurturePage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <NurturePlanner webinarId={webinarId} />;
}
