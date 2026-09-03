"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ChatPanel } from "@/components/webinar/ChatPanel";
import { EngagementLayer } from "@/components/webinar/EngagementLayer";
import { MobileChatDrawer } from "@/components/webinar/MobileChatDrawer";
import { OfferButton } from "@/components/webinar/OfferButton";
import { VideoPlayer } from "@/components/webinar/VideoPlayer";
import { ViewerCount } from "@/components/webinar/ViewerCount";
import { useRealtimeChat } from "@/hooks/useRealtimeChat";
import { useTimedComments } from "@/hooks/useTimedComments";
import { useVideoProgress } from "@/hooks/useVideoProgress";
import { useAIReplyQueue } from "@/hooks/useAIReplyQueue";
import { useEngagement } from "@/hooks/useEngagement";
import { useIsHydrated } from "@/hooks/useIsHydrated";
import { useWebinarSession } from "@/hooks/useWebinarSession";
import { captionsUrl, streamUrl } from "@/lib/cloudinary-urls";
import { readRegistrant } from "@/lib/registrant-storage";
import type { WebinarOffer } from "@/types";

export function WatchRoom({ webinarId }: { webinarId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { data, loading, error, clockOffsetMs } = useWebinarSession(webinarId);

  // Registration left their details in this browser; they never sign in.
  const hydrated = useIsHydrated();
  const registrant = useMemo(
    () => (hydrated ? readRegistrant(webinarId) : null),
    [hydrated, webinarId]
  );

  // Not started yet — hold them in the waiting room instead.
  useEffect(() => {
    if (data?.state === "waiting") router.replace(`/webinar/${webinarId}/waiting-room`);
  }, [data?.state, router, webinarId]);

  const sessionId = data?.session?.id ?? null;
  const registrantId = registrant?.id ?? null;
  const isLive = data?.state === "live";

  const reportAttendance = useCallback(
    (
      action: "join" | "progress" | "leave",
      watchSeconds?: number,
      watchPercentage?: number
    ) => {
      if (!registrantId) return;
      const body = JSON.stringify({
        registrantId,
        action,
        watchSeconds,
        watchPercentage,
      });

      // sendBeacon survives the page going away; fetch handles the rest.
      if (action === "leave" && navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/webinar/${webinarId}/attendance`,
          new Blob([body], { type: "application/json" })
        );
        return;
      }

      void fetch(`/api/webinar/${webinarId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    },
    [registrantId, webinarId]
  );

  useEffect(() => {
    if (!registrantId || !isLive) return;
    reportAttendance("join");

    const onLeave = () => reportAttendance("leave");
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      onLeave();
    };
  }, [registrantId, isLive, reportAttendance]);

  const { currentTime, duration, ended, catchingUp } = useVideoProgress({
    videoRef,
    startsAt: isLive ? (data?.session?.starts_at ?? null) : null,
    durationSeconds: data?.webinar.video_duration_seconds ?? 0,
    clockOffsetMs,
    onProgress: (watchSeconds, percentage) =>
      reportAttendance("progress", watchSeconds, percentage),
  });

  useTimedComments({
    webinarId,
    sessionId,
    currentTime,
    enabled: isLive,
  });

  const { messages, sendMessage, connected } = useRealtimeChat({
    webinarId,
    sessionId,
    registrantId: registrantId,
  });

  // Tells the server a message is waiting on a reply. All the judgement —
  // whether to reply, which persona, human mode, and the single-call guard —
  // lives in the route, because every viewer runs this.
  useAIReplyQueue({ webinarId, sessionId, messages, enabled: isLive });

  const { activePoll, activeCta, activePinned, droppedHandouts } = useEngagement({
    webinarId,
    currentTime,
    enabled: isLive,
  });

  const [offer, setOffer] = useState<WebinarOffer | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch(`/api/webinar/${webinarId}/offer`, {
        cache: "no-store",
      });
      if (!response.ok || cancelled) return;
      const payload = (await response.json()) as { offer: WebinarOffer | null };
      setOffer(payload.offer);
    })();
    return () => {
      cancelled = true;
    };
  }, [webinarId]);

  // When the video runs out, send them somewhere that tells them what happens
  // next rather than leaving them staring at a frozen frame.
  useEffect(() => {
    if (!ended) return;
    const id = setTimeout(
      () => router.replace(`/webinar/${webinarId}/ended`),
      6000
    );
    return () => clearTimeout(id);
  }, [ended, router, webinarId]);

  if (loading || !hydrated) {
    return (
      <Shell>
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <p className="text-[15px] text-[#A0A0B0]">
          {error ?? "This webinar is not available."}
        </p>
      </Shell>
    );
  }

  // A published webinar always has a video, but a room should never render a
  // player with nothing behind it.
  if (data.state === "live" && !data.webinar.video_url) {
    return (
      <Shell>
        <h1 className="text-balance text-2xl font-semibold tracking-[-0.03em] text-white">
          This session is not ready yet
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#A0A0B0]">
          The host is still finishing setup. Please check back shortly.
        </p>
      </Shell>
    );
  }

  if (data.state === "unscheduled" || data.state === "ended") {
    return (
      <Shell>
        <h1 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-white">
          This session has finished
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[#A0A0B0]">
          Watch for the replay link in your inbox, or register for the next
          session.
        </p>
      </Shell>
    );
  }

  const canChat = Boolean(registrant?.id);
  const senderName = registrant?.fullName ?? null;

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-[#0A0A0F]">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#1E1E2E] px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FF3B3B]/15 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#FF3B3B]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF3B3B] opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF3B3B]" />
            </span>
            Live
          </span>
          <h1 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-white sm:text-[15px]">
            {data.webinar.title}
          </h1>
        </div>

        <ViewerCount webinarId={webinarId} sessionId={sessionId} />
      </header>

      {/* Stage */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex shrink-0 flex-col lg:min-w-0 lg:flex-1 lg:basis-[70%] lg:p-4">
          <VideoPlayer
            videoRef={videoRef}
            src={data.webinar.video_url ?? ""}
            // Adaptive stream and captions are derived from the public id, so
            // a webinar uploaded before either existed still plays.
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
          {/* Offer zone: reserved under the video, filled the moment the host
              reveals the offer on the timeline. */}
          {offer && (
            <div className="hidden lg:block">
              <OfferButton
                offer={offer}
                webinarId={webinarId}
                registrantId={registrantId}
                currentTime={currentTime}
                variant="desktop"
              />
            </div>
          )}
        </div>

        <ChatPanel
          messages={messages}
          onSend={sendMessage}
          senderName={senderName}
          canChat={canChat}
          connected={connected}
          pinnedMessage={activePinned?.content ?? null}
          className="hidden border-l lg:flex lg:w-[30%] lg:max-w-[420px] lg:min-w-[320px]"
        />

        {/* Fills the space under the video on mobile so the layout is not empty
            behind the drawer. */}
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center lg:hidden">
          <p className="text-[13px] leading-relaxed text-[#A0A0B0]/70">
            {messages.length
              ? `${messages.length} messages in the chat — tap to join in.`
              : "Tap the chat button to say hello."}
          </p>
        </div>
      </div>

      <MobileChatDrawer
        messages={messages}
        onSend={sendMessage}
        senderName={senderName}
        canChat={canChat}
        connected={connected}
        pinnedMessage={activePinned?.content ?? null}
      />

      <EngagementLayer
        webinarId={webinarId}
        sessionId={sessionId}
        registrantId={registrantId}
        poll={activePoll}
        cta={activeCta}
        handouts={droppedHandouts}
        offerVisible={Boolean(
          offer && currentTime >= offer.trigger_video_offset_seconds
        )}
      />

      {offer && (
        <OfferButton
          offer={offer}
          webinarId={webinarId}
          registrantId={registrantId}
          currentTime={currentTime}
          variant="mobile"
        />
      )}
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0A0A0F] px-5 text-center">
      <div className="flex flex-col items-center">{children}</div>
    </main>
  );
}
