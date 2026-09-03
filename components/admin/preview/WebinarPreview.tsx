"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, FlaskConical, Loader2, RotateCcw } from "lucide-react";

import { OfferButton } from "@/components/webinar/OfferButton";
import { VideoPlayer } from "@/components/webinar/VideoPlayer";
import { EmptyState } from "@/components/ui/EmptyState";
import { useVideoProgress } from "@/hooks/useVideoProgress";
import { captionsUrl, streamUrl } from "@/lib/cloudinary-urls";
import { cn, formatOffset } from "@/lib/utils";
import { saveRegistrant } from "@/lib/registrant-storage";
import { useToast } from "@/components/ui/ToastProvider";
import type { WebinarOffer } from "@/types";

type Comment = {
  id: string;
  content: string;
  offsetSeconds: number;
  senderName: string;
  senderLocation: string | null;
};

type Payload = {
  webinar: {
    id: string;
    title: string;
    video_url: string | null;
    video_public_id: string | null;
    video_duration_seconds: number | null;
    thumbnail_url: string | null;
  };
  session: { starts_at: string };
  comments: Comment[];
  offer: WebinarOffer | null;
};

/** Jump-in points, so a host can check the end without watching the middle. */
const SKIPS = [0, 300, 900, 1800];

/**
 * The host watching their own webinar.
 *
 * Renders the real player against a synthetic session clock, so the video,
 * the timed comments and the offer all behave exactly as they will live —
 * without a registrant, an attendance record, or a row in anyone's analytics.
 *
 * Its absence was the likeliest reason a first webinar went out wrong: there
 * was no way to see the thing before real people did.
 */
export function WebinarPreview({ webinarId }: { webinarId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const toast = useToast();

  const load = useCallback(
    async (from: number) => {
      setLoading(true);
      const response = await fetch(
        `/api/webinar/${webinarId}/preview?offset=${from}`,
        { cache: "no-store" }
      );
      if (response.ok) setData((await response.json()) as Payload);
      setLoading(false);
    },
    [webinarId]
  );

  useEffect(() => {
    const timer = setTimeout(() => void load(offset), 0);
    return () => clearTimeout(timer);
  }, [load, offset]);

  /*
   * The dress rehearsal, as opposed to the inspection above.
   *
   * This page simulates the room so a host can scrub through it. What it
   * cannot simulate is the room itself — real chat, personas answering, the
   * poll filling in, the viewer count. A test run is the actual watch page
   * against a session that is marked so it never counts.
   */
  const startTestRun = useCallback(async () => {
    setStarting(true);
    const response = await fetch(`/api/admin/webinar/${webinarId}/test-session`, {
      method: "POST",
    });
    const payload = (await response.json()) as {
      error?: string;
      sessionId?: string;
      registrant?: { id: string; fullName: string };
      watchUrl?: string;
    };

    if (!response.ok || !payload.watchUrl || !payload.registrant) {
      setStarting(false);
      toast.error(payload.error ?? "Could not start a test run.");
      return;
    }

    // Stored under the test session's own key, so a host who has also
    // registered for their own webinar keeps that registration.
    saveRegistrant(
      {
        id: payload.registrant.id,
        webinarId,
        sessionId: payload.sessionId ?? null,
        fullName: payload.registrant.fullName,
        countryFlag: "",
      },
      payload.sessionId
    );

    window.location.assign(payload.watchUrl);
  }, [webinarId, toast]);

  const duration = data?.webinar.video_duration_seconds ?? 0;

  const { currentTime, ended, catchingUp } = useVideoProgress({
    videoRef,
    startsAt: data?.session.starts_at ?? null,
    durationSeconds: duration,
    clockOffsetMs: 0,
  });

  // The same rule the live room uses: a comment appears once its offset passes.
  const visible = (data?.comments ?? []).filter(
    (comment) => comment.offsetSeconds <= currentTime
  );

  if (loading && !data) {
    return (
      <div className="grid h-[60dvh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (!data?.webinar.video_url) {
    return (
      <div className="px-6 py-10">
        <EmptyState
          icon="🎬"
          title="No video to preview"
          description="Upload a video for this webinar and the preview will play it exactly as an attendee will see it."
          action={
            <Link
              href={`/admin/webinar/${webinarId}`}
              className="text-[13px] text-[#6C47FF]"
            >
              Back to setup
            </Link>
          }
        />
      </div>
    );
  }

  const offer = data.offer;
  const offerVisible =
    offer && currentTime >= (offer.trigger_video_offset_seconds ?? 0);

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Impossible to mistake for the real room. */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#6C47FF]/40 bg-[#6C47FF]/10 px-4 py-2.5">
        <Eye className="h-4 w-4 shrink-0 text-[#8A6BFF]" />
        <p className="flex-1 text-[12.5px] text-[#C4C4D0]">
          Preview — nothing here is recorded. No attendance, no analytics, no
          automation.
        </p>

        <button
          onClick={() => void startTestRun()}
          disabled={starting}
          title="Opens the real watch page against a session that never counts"
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#6C47FF] px-3 text-[12px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-60"
        >
          {starting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <FlaskConical className="h-3 w-3" />
          )}
          Test run
        </button>

        <div className="flex items-center gap-1">
          {SKIPS.filter((skip) => skip < duration).map((skip) => (
            <button
              key={skip}
              onClick={() => setOffset(skip)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11.5px] transition-colors",
                offset === skip
                  ? "bg-[#6C47FF] text-white"
                  : "text-[#A0A0B0] hover:text-white"
              )}
            >
              {skip === 0 ? "Start" : formatOffset(skip)}
            </button>
          ))}
          {offer && (
            <button
              onClick={() =>
                setOffset(Math.max(0, (offer.trigger_video_offset_seconds ?? 0) - 10))
              }
              className="rounded-full px-2.5 py-1 text-[11.5px] text-[#00D4FF] hover:text-white"
              title="Jump to just before the offer appears"
            >
              Offer
            </button>
          )}
          <button
            onClick={() => load(offset)}
            title="Restart from here"
            className="grid h-7 w-7 place-items-center rounded-full text-[#A0A0B0] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <VideoPlayer
            videoRef={videoRef}
            src={data.webinar.video_url}
            streamSrc={
              data.webinar.video_public_id
                ? streamUrl(data.webinar.video_public_id)
                : null
            }
            captionsSrc={
              data.webinar.video_public_id
                ? captionsUrl(data.webinar.video_public_id)
                : null
            }
            poster={data.webinar.thumbnail_url}
            currentTime={currentTime}
            duration={duration}
            ended={ended}
            catchingUp={catchingUp}
          />

          {offerVisible && offer && (
            <div className="mt-3">
              {/* registrantId is null: a click here records nothing, which is
                  the whole point of a preview. */}
              <OfferButton
                offer={offer}
                webinarId={webinarId}
                registrantId={null}
                currentTime={currentTime}
                variant="desktop"
              />
            </div>
          )}
        </div>

        {/* Chat, exactly as it will fill. */}
        <aside className="flex h-[520px] flex-col rounded-xl border border-[#1E1E2E] bg-[#0D0D15]">
          <header className="border-b border-[#1E1E2E] px-4 py-2.5">
            <h2 className="text-[13px] font-semibold text-white">Chat</h2>
            <p className="text-[11px] text-[#6E6E80]">
              {visible.length} of {data.comments.length} timed comments shown
            </p>
          </header>

          <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
            {visible.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12px] text-[#6E6E80]">
                No comments scheduled this early. The first lands at{" "}
                {data.comments[0]
                  ? formatOffset(data.comments[0].offsetSeconds)
                  : "— none configured"}
                .
              </p>
            ) : (
              visible
                .slice(-40)
                .map((comment) => (
                  <div key={comment.id} className="text-[12.5px]">
                    <span className="font-medium text-[#8A6BFF]">
                      {comment.senderName}
                    </span>
                    {comment.senderLocation && (
                      <span className="ml-1.5 text-[10.5px] text-[#6E6E80]">
                        {comment.senderLocation}
                      </span>
                    )}
                    <span className="ml-1.5 font-mono text-[10px] text-[#4A4A5C]">
                      {formatOffset(comment.offsetSeconds)}
                    </span>
                    <p className="mt-0.5 leading-relaxed text-[#C4C4D0]">
                      {comment.content}
                    </p>
                  </div>
                ))
            )}
          </div>
        </aside>
      </div>

      <p className="mt-4 flex items-center gap-2 text-[12px] text-[#6E6E80]">
        <ArrowLeft className="h-3 w-3" />
        <Link href={`/admin/webinar/${webinarId}/comments`} className="hover:text-white">
          Edit timed comments
        </Link>
        <span>·</span>
        <Link href={`/admin/webinar/${webinarId}/offer`} className="hover:text-white">
          Edit the offer
        </Link>
      </p>
    </div>
  );
}
