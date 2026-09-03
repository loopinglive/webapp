"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Film, Loader2, Sparkles } from "lucide-react";

import { Backstage } from "@/components/live/Backstage";
import { BroadcastPanel } from "@/components/live/BroadcastPanel";
import { UpgradeWall } from "@/components/billing/UpgradeWall";
import { useToast } from "@/components/ui/ToastProvider";
import { SkeletonChart } from "@/components/ui/Skeleton";
import { formatOffset } from "@/lib/utils";

type LiveSession = {
  id: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  recording_url: string | null;
  recording_error: string | null;
  converted_at: string | null;
};

type State = {
  configured: boolean;
  live: LiveSession | null;
  waitingCount: number;
  serverUrl: string | null;
  upcomingSession: { id: string } | null;
};

/**
 * The host's whole live journey: backstage, broadcasting, and the step that
 * matters most — turning what just happened into a webinar that runs forever.
 */
export function LiveStudio({
  webinarId,
  clips,
}: {
  webinarId: string;
  clips: { id: string; title: string; url: string }[];
}) {
  const toast = useToast();
  const [state, setState] = useState<State | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [wallOpen, setWallOpen] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/live/${webinarId}`, { cache: "no-store" });
    if (response.ok) setState((await response.json()) as State);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  // The waiting count is the reason to keep this fresh while backstage.
  useEffect(() => {
    if (state?.live?.status === "live") return;
    const poll = setInterval(() => void load(), 10_000);
    return () => clearInterval(poll);
  }, [state?.live?.status, load]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      const response = await fetch(`/api/live/${webinarId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        error?: string;
        upgradeRequired?: boolean;
        token?: string;
        recordingError?: string;
      };
      return { ok: response.ok, payload };
    },
    [webinarId]
  );

  async function goLive() {
    setStarting(true);

    // Claim a room first if we do not already have one.
    if (!token) {
      const backstage = await post({
        action: "backstage",
        sessionId: state?.upcomingSession?.id ?? null,
      });
      if (!backstage.ok) {
        setStarting(false);
        toast.error(backstage.payload.error ?? "Could not open the room.");
        return;
      }
      setToken(backstage.payload.token ?? null);
    }

    const result = await post({ action: "go_live" });
    setStarting(false);

    if (!result.ok) {
      if (result.payload.upgradeRequired) {
        setWallOpen(true);
        return;
      }
      toast.error(result.payload.error ?? "Could not go live.");
      return;
    }

    if (result.payload.recordingError) {
      // Said out loud now, not discovered a week later at conversion.
      toast.warning(
        "You are live, but recording failed to start — this session will not be convertible."
      );
    }

    await load();
  }

  async function convert(overwriteVideo = false) {
    setConverting(true);
    const response = await fetch(`/api/live/${webinarId}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveSessionId: state?.live?.id, overwriteVideo }),
    });

    const payload = (await response.json()) as {
      error?: string;
      needsConfirmation?: boolean;
      stillProcessing?: boolean;
      commentsCreated?: number;
    };
    setConverting(false);

    if (!response.ok) {
      if (payload.needsConfirmation) {
        if (
          window.confirm(
            "This webinar already has a video. Replace it with the recording of this session?"
          )
        ) {
          await convert(true);
        }
        return;
      }
      toast.error(payload.error ?? "Could not convert.");
      return;
    }

    toast.success(
      payload.commentsCreated
        ? `Converted, with ${payload.commentsCreated} timed comments from the real chat.`
        : "Converted."
    );
    await load();
  }

  if (!state) {
    return (
      <div className="px-6 py-8">
        <SkeletonChart height={340} />
      </div>
    );
  }

  // ── Broadcasting ──
  if (state.live?.status === "live" && token && state.serverUrl) {
    return (
      <BroadcastPanel
        webinarId={webinarId}
        token={token}
        serverUrl={state.serverUrl}
        startedAt={state.live.started_at}
        clips={clips}
        onEnded={load}
      />
    );
  }

  // ── Finished: the conversion step ──
  const finished = state.live && ["ended", "processing", "converted"].includes(state.live.status);

  if (finished && state.live) {
    const session = state.live;
    const converted = session.status === "converted";

    return (
      <div className="mx-auto max-w-[620px] px-6 py-16 text-center">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#6C47FF] to-[#00D4FF]">
          {converted ? (
            <Sparkles className="h-5 w-5 text-white" />
          ) : (
            <Film className="h-5 w-5 text-white" />
          )}
        </span>

        <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.025em] text-white">
          {converted ? "It runs on its own now" : "That is a wrap"}
        </h2>

        <p className="mx-auto mt-2 max-w-[46ch] text-[14.5px] leading-relaxed text-[#A0A0B0]">
          {converted
            ? "The recording is this webinar's video, and the real conversation is now its timed comments. Set a schedule and it runs without you."
            : session.recording_error
              ? `This session was not recorded: ${session.recording_error}`
              : "Turn this session into a webinar that runs on a schedule. The recording becomes the video, and the chat that just happened becomes the timed comments."}
        </p>

        {session.duration_seconds ? (
          <p className="mt-3 text-[12.5px] text-[#6E6E80]">
            Ran for {formatOffset(session.duration_seconds)}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col items-center gap-3">
          {converted ? (
            <Link
              href={`/admin/webinar/${webinarId}/schedule`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#6C47FF] px-6 text-[14px] font-semibold text-white hover:bg-[#7C5AFF]"
            >
              Set the schedule
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              onClick={() => convert()}
              disabled={converting || Boolean(session.recording_error)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#6C47FF] px-6 text-[14px] font-semibold text-white hover:bg-[#7C5AFF] disabled:opacity-40"
            >
              {converting && <Loader2 className="h-4 w-4 animate-spin" />}
              Turn this into an automated webinar
            </button>
          )}

          <button
            onClick={() => {
              setToken(null);
              setState((current) => (current ? { ...current, live: null } : current));
            }}
            className="text-[13px] text-[#6E6E80] hover:text-white"
          >
            Start another broadcast
          </button>
        </div>

        {session.status === "processing" && !session.recording_url && (
          <p className="mt-6 text-[12.5px] text-[#FFB020]">
            The recording is still being processed. Converting will tell you if it is not
            ready yet.
          </p>
        )}
      </div>
    );
  }

  // ── Backstage ──
  return (
    <>
      <Backstage
        configured={state.configured}
        waitingCount={state.waitingCount}
        onGoLive={goLive}
        starting={starting}
      />
      <UpgradeWall open={wallOpen} onClose={() => setWallOpen(false)} />
    </>
  );
}
