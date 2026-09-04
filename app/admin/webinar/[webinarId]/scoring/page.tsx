import type { Metadata } from "next";

import { AttendeeScoring } from "@/components/intelligence/AttendeeScoring";

export const metadata: Metadata = { title: "Attendee Scoring" };

export default async function ScoringPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <AttendeeScoring webinarId={webinarId} />;
}
