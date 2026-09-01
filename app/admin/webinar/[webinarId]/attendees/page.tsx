import type { Metadata } from "next";

import { AttendeesPage } from "@/components/attendees/AttendeesPage";

export const metadata: Metadata = { title: "Attendees" };

export default async function WebinarAttendeesPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <AttendeesPage webinarId={webinarId} />;
}
