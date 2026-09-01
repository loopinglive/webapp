import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";

import { ReplayPlayer } from "@/components/webinar/ReplayPlayer";
import { createServiceClient } from "@/lib/supabase/server";
import type { WebinarOffer } from "@/types";

export const metadata: Metadata = { title: "Replay" };
export const dynamic = "force-dynamic";

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: access } = await supabase
    .from("replay_access")
    .select("*")
    .eq("access_token", token)
    .maybeSingle();

  if (!access || !access.is_active) {
    return (
      <Shell title="This replay link is not valid">
        Check the link in your email, or register for the next live session.
      </Shell>
    );
  }

  // Reading the clock is the whole point of an expiry check, and this is a
  // force-dynamic Server Component: it runs once per request, not per render.
  // eslint-disable-next-line react-hooks/purity
  const expired = new Date(access.expires_at).getTime() < Date.now();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, video_url, video_duration_seconds, thumbnail_url")
    .eq("id", access.webinar_id)
    .maybeSingle();

  if (expired || !webinar?.video_url) {
    return (
      <Shell
        title={expired ? "This replay has expired" : "This replay is not ready"}
        webinarId={access.webinar_id}
      >
        {expired
          ? `The replay closed on ${new Date(access.expires_at).toLocaleString()}. You can still catch the next live session.`
          : "The host has not finished setting this webinar up."}
      </Shell>
    );
  }

  // First view is worth recording — it separates "sent a replay" from
  // "watched the replay" in the follow-up data.
  await supabase
    .from("replay_access")
    .update({
      first_accessed_at: access.first_accessed_at ?? new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    })
    .eq("id", access.id);

  const { data: offer } = await supabase
    .from("webinar_offers")
    .select("*")
    .eq("webinar_id", access.webinar_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return (
    <ReplayPlayer
      token={token}
      webinarId={webinar.id}
      title={webinar.title}
      videoUrl={webinar.video_url}
      posterUrl={webinar.thumbnail_url}
      durationSeconds={webinar.video_duration_seconds ?? 0}
      expiresAt={access.expires_at}
      offer={(offer as WebinarOffer | null) ?? null}
    />
  );
}

function Shell({
  title,
  children,
  webinarId,
}: {
  title: string;
  children: React.ReactNode;
  webinarId?: string;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0A0A0F] px-5 text-center">
      <div className="max-w-md">
        <h1 className="text-balance text-[26px] font-semibold tracking-[-0.03em] text-white">
          {title}
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-[#A0A0B0]">
          {children}
        </p>
        {webinarId && (
          <Link
            href={`/webinar/${webinarId}/register`}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#6C47FF] px-6 text-[14.5px] font-semibold text-white shadow-[0_12px_40px_-10px_#6C47FF] transition-colors hover:bg-[#7C5AFF]"
          >
            <CalendarClock className="h-4 w-4" />
            Register for the next session
          </Link>
        )}
      </div>
    </main>
  );
}
