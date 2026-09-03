"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRoomContext,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Check,
  Film,
  Loader2,
  MessageCircleQuestion,
  Mic,
  MicOff,
  MonitorUp,
  Radio,
  Square,
  Star,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { cn, formatOffset } from "@/lib/utils";

type Question = {
  id: string;
  author_name: string;
  question: string;
  status: string;
  is_featured: boolean;
  upvotes: number;
  video_offset_seconds: number | null;
};

type Clip = { id: string; title: string; url: string };

export function BroadcastPanel({
  webinarId,
  token,
  serverUrl,
  startedAt,
  clips,
  onEnded,
}: {
  webinarId: string;
  token: string;
  serverUrl: string;
  startedAt: string | null;
  clips: Clip[];
  onEnded: () => void;
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video
      audio
      // The host's own audio must not play back to them.
      data-lk-theme="default"
      className="min-h-dvh bg-[#0A0A0F]"
    >
      <Stage
        webinarId={webinarId}
        startedAt={startedAt}
        clips={clips}
        onEnded={onEnded}
      />
    </LiveKitRoom>
  );
}

function Stage({
  webinarId,
  startedAt,
  clips,
  onEnded,
}: {
  webinarId: string;
  startedAt: string | null;
  clips: Clip[];
  onEnded: () => void;
}) {
  const toast = useToast();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [playingClip, setPlayingClip] = useState<Clip | null>(null);
  const [ending, setEnding] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const localVideo = tracks.find((t) => t.participant.isLocal);

  // Viewers, from the room rather than an estimate.
  const viewers = Math.max(0, room.numParticipants - 1);

  useEffect(() => {
    if (!startedAt) return;
    const begin = new Date(startedAt).getTime();
    const timer = setInterval(
      () => setElapsed(Math.max(0, Math.round((Date.now() - begin) / 1000))),
      1000
    );
    return () => clearInterval(timer);
  }, [startedAt]);

  const loadQuestions = useCallback(async () => {
    const response = await fetch(`/api/live/${webinarId}/questions`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = (await response.json()) as { questions: Question[] };
      setQuestions(data.questions);
    }
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadQuestions(), 0);
    const poll = setInterval(() => void loadQuestions(), 8000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [loadQuestions]);

  /** Records what is on screen, so the recording can be annotated later. */
  const markSegment = useCallback(
    (kind: string, label: string, sourceUrl?: string) =>
      fetch(`/api/live/${webinarId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "segment", kind, label, sourceUrl }),
      }).catch(() => {}),
    [webinarId]
  );

  async function toggleMic() {
    const next = !micOn;
    await localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  async function toggleCamera() {
    const next = !cameraOn;
    await localParticipant.setCameraEnabled(next);
    setCameraOn(next);
  }

  async function toggleShare() {
    const next = !sharing;
    try {
      // Camera stays published — sharing a screen must not drop the host.
      await localParticipant.setScreenShareEnabled(next, { audio: true });
      setSharing(next);
      void markSegment(next ? "screen" : "camera", next ? "Screen share" : "Live camera");
    } catch {
      toast.error("Screen share was cancelled or blocked.");
    }
  }

  async function playClip(clip: Clip | null) {
    setPlayingClip(clip);
    void markSegment(
      clip ? "recorded_clip" : "camera",
      clip ? clip.title : "Live camera",
      clip?.url
    );
    // The camera pauses while a clip plays so two video sources do not compete.
    await localParticipant.setCameraEnabled(clip ? false : cameraOn);
  }

  async function moderate(questionId: string, action: string) {
    await fetch(`/api/live/${webinarId}/questions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action }),
    });
    await loadQuestions();
  }

  async function end() {
    if (!window.confirm("End the broadcast for everyone?")) return;
    setEnding(true);
    await fetch(`/api/live/${webinarId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "end" }),
    });
    await room.disconnect();
    onEnded();
  }

  const pending = questions.filter((q) => q.status === "pending");
  const answered = questions.filter((q) => q.status === "answered");

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[1fr_360px] lg:grid-rows-1">
      {/* Stage */}
      <div className="flex flex-col p-4 lg:p-6">
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-[#1E1E2E] bg-black">
          {playingClip ? (
            <video
              key={playingClip.id}
              src={playingClip.url}
              autoPlay
              controls
              className="h-full w-full object-contain"
              onEnded={() => playClip(null)}
            />
          ) : localVideo ? (
            <VideoTrack
              trackRef={localVideo}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-[13px] text-[#6E6E80]">
              Camera is off
            </div>
          )}

          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3B3B] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live
            </span>
            <span className="rounded-full bg-black/60 px-2.5 py-1 font-mono text-[11px] tabular-nums text-white backdrop-blur">
              {formatOffset(elapsed)}
            </span>
            {playingClip && (
              <span className="rounded-full bg-[#6C47FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                Playing clip
              </span>
            )}
          </div>

          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[12px] tabular-nums text-white backdrop-blur">
            <Users className="h-3.5 w-3.5" />
            {viewers}
          </span>
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Control active={micOn} onClick={toggleMic} label={micOn ? "Mute" : "Unmute"}>
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Control>

          <Control
            active={cameraOn && !playingClip}
            onClick={toggleCamera}
            disabled={Boolean(playingClip)}
            label={cameraOn ? "Camera off" : "Camera on"}
          >
            {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Control>

          <Control active={sharing} onClick={toggleShare} label="Share screen">
            <MonitorUp className="h-4 w-4" />
          </Control>

          {clips.length > 0 && (
            <select
              value={playingClip?.id ?? ""}
              onChange={(event) => {
                const clip = clips.find((c) => c.id === event.target.value) ?? null;
                void playClip(clip);
              }}
              className="h-10 rounded-full border border-[#2A2A3A] bg-[#12121A] px-3 text-[13px] text-white focus:outline-none"
            >
              <option value="">Live camera</option>
              {clips.map((clip) => (
                <option key={clip.id} value={clip.id}>
                  Play: {clip.title}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={end}
            disabled={ending}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-[#FF3B3B] px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#FF5A5A] disabled:opacity-50"
          >
            {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
            End broadcast
          </button>
        </div>
      </div>

      {/* Q&A */}
      <aside className="flex min-h-0 flex-col border-t border-[#1E1E2E] bg-[#0D0D15] lg:border-l lg:border-t-0">
        <header className="flex items-center gap-2 border-b border-[#1E1E2E] px-4 py-3">
          <MessageCircleQuestion className="h-4 w-4 text-[#6C47FF]" />
          <h2 className="text-[14px] font-semibold text-white">Questions</h2>
          <span className="ml-auto text-[11.5px] tabular-nums text-[#6E6E80]">
            {pending.length} waiting · {answered.length} answered
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-3">
          {questions.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12.5px] text-[#6E6E80]">
              Questions from attendees appear here. Chat stays in the chat panel — this
              is a queue you work through.
            </p>
          ) : (
            <ul className="space-y-2">
              {questions
                .filter((q) => q.status !== "dismissed")
                .map((question) => (
                  <li
                    key={question.id}
                    className={cn(
                      "rounded-xl border p-3",
                      question.is_featured
                        ? "border-[#6C47FF]/60 bg-[#6C47FF]/8"
                        : question.status === "answered"
                          ? "border-[#1E1E2E] bg-[#12121A] opacity-60"
                          : "border-[#1E1E2E] bg-[#12121A]"
                    )}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] font-medium text-white">
                        {question.author_name}
                      </span>
                      {question.upvotes > 0 && (
                        <span className="text-[11px] text-[#00D4FF]">
                          ▲ {question.upvotes}
                        </span>
                      )}
                      {question.status === "answered" && (
                        <span className="ml-auto text-[10.5px] text-[#00C851]">
                          answered
                          {question.video_offset_seconds !== null &&
                            ` at ${formatOffset(question.video_offset_seconds)}`}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[13px] leading-relaxed text-[#D4D4DE]">
                      {question.question}
                    </p>

                    {question.status !== "answered" && (
                      <div className="mt-2.5 flex gap-1.5">
                        <QaAction
                          onClick={() => moderate(question.id, "answer")}
                          tone="#00C851"
                        >
                          <Check className="h-3 w-3" />
                          Answered
                        </QaAction>
                        <QaAction
                          onClick={() =>
                            moderate(
                              question.id,
                              question.is_featured ? "unfeature" : "feature"
                            )
                          }
                          tone="#6C47FF"
                        >
                          <Star className="h-3 w-3" />
                          {question.is_featured ? "Unfeature" : "Feature"}
                        </QaAction>
                        <QaAction
                          onClick={() => moderate(question.id, "dismiss")}
                          tone="#6E6E80"
                        >
                          <X className="h-3 w-3" />
                        </QaAction>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>

        <p className="border-t border-[#1E1E2E] px-4 py-3 text-[11px] leading-relaxed text-[#6E6E80]">
          <Film className="mr-1.5 inline h-3 w-3" />
          Answered questions carry into the replay as timed comments at the moment you
          answered them.
        </p>
      </aside>
    </div>
  );
}

function Control({
  active,
  onClick,
  disabled,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full border transition-colors",
        active
          ? "border-[#2A2A3A] bg-[#12121A] text-white hover:border-[#6C47FF]/50"
          : "border-transparent bg-[#FF3B3B]/15 text-[#FF6B6B]",
        "disabled:opacity-40"
      )}
    >
      {children}
    </button>
  );
}

function QaAction({
  onClick,
  tone,
  children,
}: {
  onClick: () => void;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{ color: tone }}
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#1E1E2E] px-2 text-[11.5px] transition-colors hover:bg-white/5"
    >
      {children}
    </button>
  );
}

export { Radio };
