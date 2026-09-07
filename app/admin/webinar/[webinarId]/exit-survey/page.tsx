import type { Metadata } from "next";

import { ExitSurveyBuilder } from "@/components/admin/webinar/ExitSurveyBuilder";

export const metadata: Metadata = { title: "Exit survey" };

export default async function ExitSurveyPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <ExitSurveyBuilder webinarId={webinarId} />;
}
