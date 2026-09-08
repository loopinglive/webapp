import type { Metadata } from "next";

import { MultiStreamSetup } from "@/components/streaming/MultiStreamSetup";

export const metadata: Metadata = { title: "Multi-Platform Streaming" };

export default async function StreamingPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;

  return (
    <div className="px-6 py-8 lg:px-10">
      <h1 className="text-[20px] font-semibold tracking-tight text-white">Multi-Platform Streaming</h1>
      <p className="mt-1.5 max-w-[62ch] text-[13.5px] text-[#A0A0B0]">
        Stream to YouTube, Facebook, LinkedIn, Twitch, or a custom RTMP
        endpoint at the same time as your live session — set up your
        destinations here, then start streaming from the Go Live tab once
        you&rsquo;re on air.
      </p>
      <div className="mt-6">
        <MultiStreamSetup webinarId={webinarId} />
      </div>
    </div>
  );
}
