import type { Metadata } from "next";

import { AttendeeProfile } from "@/components/attendees/AttendeeProfile";

export const metadata: Metadata = { title: "Attendee" };

export default async function AttendeeProfilePage({
  params,
}: {
  params: Promise<{ webinarId: string; registrantId: string }>;
}) {
  const { webinarId, registrantId } = await params;
  return <AttendeeProfile webinarId={webinarId} registrantId={registrantId} />;
}
