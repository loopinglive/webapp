import type { Metadata } from "next";

import { ScheduleBuilder } from "@/components/admin/schedule/ScheduleBuilder";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <ScheduleBuilder webinarId={webinarId} />;
}
