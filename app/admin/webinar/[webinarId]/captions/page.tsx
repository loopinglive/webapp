import type { Metadata } from "next";

import { VideoCaptionsEditor } from "@/components/admin/webinar/VideoCaptionsEditor";

export const metadata: Metadata = { title: "Video Captions" };

export default async function VideoCaptionsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <VideoCaptionsEditor webinarId={webinarId} />;
}
