import type { Metadata } from "next";

import { InteractiveElementEditor } from "@/components/video-advanced/InteractiveElementEditor";
import { VideoChapterEditor } from "@/components/video-advanced/VideoChapterEditor";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Video Chapters" };
export const dynamic = "force-dynamic";

export default async function VideoFeaturesPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;

  const supabase = createServiceClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("video_duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  const duration = webinar?.video_duration_seconds ?? 0;

  return (
    <div className="space-y-10 px-6 py-8 lg:px-10">
      <section>
        <h1 className="text-[20px] font-semibold tracking-tight text-white">Video Chapters</h1>
        <p className="mt-1.5 max-w-[62ch] text-[13.5px] text-[#A0A0B0]">
          Chapters give replay and on-demand viewers a way to jump to the part
          that matters — never shown during a fake-live session, since there is
          nothing to skip to.
        </p>
        <div className="mt-6">
          <VideoChapterEditor webinarId={webinarId} durationSeconds={duration} />
        </div>
      </section>

      <section className="border-t border-[#1E1E2E] pt-8">
        <h2 className="text-[16px] font-semibold text-white">Interactive Elements</h2>
        <p className="mt-1.5 max-w-[62ch] text-[13.5px] text-[#A0A0B0]">
          Hotspots and share prompts overlay the video at a timestamp you set.
          Progress milestones and chapter-transition cards happen automatically
          — nothing to configure for those.
        </p>
        <div className="mt-6">
          <InteractiveElementEditor webinarId={webinarId} />
        </div>
      </section>
    </div>
  );
}
