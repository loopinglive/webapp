import type { Metadata } from "next";

import { LiveStudio } from "@/components/live/LiveStudio";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Go live" };
export const dynamic = "force-dynamic";

export default async function LivePage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;

  // Clips available for hybrid mode: this webinar's own uploaded video, plus
  // any other video the host already has. Fetched server-side so the studio
  // does not need a second round trip before it can offer them.
  const supabase = createServiceClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, video_url, owner_id")
    .eq("id", webinarId)
    .maybeSingle();

  const { data: others } = webinar?.owner_id
    ? await supabase
        .from("webinars")
        .select("id, title, video_url")
        .eq("owner_id", webinar.owner_id)
        .not("video_url", "is", null)
        .limit(20)
    : { data: [] };

  const clips = (others ?? [])
    .filter((row) => row.video_url)
    .map((row) => ({ id: row.id, title: row.title, url: row.video_url as string }));

  return (
    <>
      <SectionHeader
        title="Go live"
        description="Broadcast now, then turn the recording into a webinar that runs on a schedule."
      />
      <LiveStudio webinarId={webinarId} clips={clips} />
    </>
  );
}
