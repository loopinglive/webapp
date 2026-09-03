"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Mic, Radio, Users, Video } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/utils";

type Device = { deviceId: string; label: string };

/**
 * The room before the room.
 *
 * Two things here earn their place. The audio meter, because a silent
 * microphone is the most common way a webinar fails and it is silent by
 * definition — the host cannot hear their own problem. And the waiting count,
 * because that is the number that makes someone press the button.
 */
export function Backstage({
  configured,
  waitingCount,
  onGoLive,
  starting,
}: {
  configured: boolean;
  waitingCount: number;
  onGoLive: (devices: { cameraId: string; micId: string }) => void;
  starting: boolean;
}) {
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [cameras, setCameras] = useState<Device[]>([]);
  const [mics, setMics] = useState<Device[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [micId, setMicId] = useState("");
  const [level, setLevel] = useState(0);
  const [permission, setPermission] = useState<"pending" | "granted" | "denied">(
    "pending"
  );
  const [ready, setReady] = useState(false);

  /** Attaches a preview and starts metering. Replaces any previous stream. */
  const start = useCallback(
    async (camera?: string, mic?: string) => {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: camera ? { deviceId: { exact: camera } } : true,
          audio: mic ? { deviceId: { exact: mic } } : true,
        });

        streamRef.current = stream;
        setPermission("granted");
        setReady(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Labels are empty until permission is granted, so enumerate after.
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameras(
          devices
            .filter((d) => d.kind === "videoinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || "Camera" }))
        );
        setMics(
          devices
            .filter((d) => d.kind === "audioinput")
            .map((d) => ({ deviceId: d.deviceId, label: d.label || "Microphone" }))
        );

        const track = stream.getVideoTracks()[0];
        if (track && !camera) setCameraId(track.getSettings().deviceId ?? "");
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack && !mic) setMicId(audioTrack.getSettings().deviceId ?? "");

        // Audio meter.
        audioContextRef.current?.close().catch(() => {});
        const context = new AudioContext();
        audioContextRef.current = context;

        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const buffer = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteTimeDomainData(buffer);
          // RMS around the 128 midpoint, which is silence for 8-bit PCM.
          let sum = 0;
          for (const value of buffer) {
            const centred = (value - 128) / 128;
            sum += centred * centred;
          }
          setLevel(Math.min(1, Math.sqrt(sum / buffer.length) * 3));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setPermission("denied");
        setReady(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!configured) return;

    // Deferred so getUserMedia's setState lands outside the effect body.
    const timer = setTimeout(() => void start(), 0);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioContextRef.current?.close().catch(() => {});
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [configured, start]);

  if (!configured) {
    return (
      <div className="mx-auto max-w-[560px] px-6 py-16 text-center">
        <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-[#FFB020]/12">
          <AlertTriangle className="h-5 w-5 text-[#FFB020]" />
        </span>
        <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-white">
          Live broadcasting is not configured
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#A0A0B0]">
          Set <code className="text-[#00D4FF]">LIVEKIT_API_KEY</code>,{" "}
          <code className="text-[#00D4FF]">LIVEKIT_API_SECRET</code> and{" "}
          <code className="text-[#00D4FF]">LIVEKIT_URL</code> in your environment, then
          reload this page. Everything else on the platform works without them.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Preview */}
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-[#1E1E2E] bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className="h-full w-full object-cover"
            />

            {permission === "denied" && (
              <div className="absolute inset-0 grid place-items-center bg-[#0D0D15] px-8 text-center">
                <div>
                  <Camera className="mx-auto h-6 w-6 text-[#FF6B6B]" />
                  <p className="mt-3 text-[14px] font-medium text-white">
                    Camera and microphone are blocked
                  </p>
                  <p className="mx-auto mt-1.5 max-w-[38ch] text-[12.5px] leading-relaxed text-[#A0A0B0]">
                    Click the padlock in your browser&rsquo;s address bar, allow camera
                    and microphone for this site, then reload.
                  </p>
                  <button
                    onClick={() => start(cameraId || undefined, micId || undefined)}
                    className="mt-4 h-9 rounded-full border border-[#2A2A3A] px-4 text-[13px] text-white hover:border-[#6C47FF]/50"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0] backdrop-blur">
              Backstage · not broadcasting
            </span>
          </div>

          {/* Audio meter */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <Mic className="h-3.5 w-3.5 text-[#A0A0B0]" />
              <span className="text-[12px] text-[#A0A0B0]">Microphone level</span>
              {ready && level < 0.02 && (
                <span className="ml-auto text-[11.5px] text-[#FFB020]">
                  Nothing detected — say something
                </span>
              )}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1A1A2A]">
              <div
                className="h-full rounded-full transition-[width] duration-75"
                style={{
                  width: `${Math.round(level * 100)}%`,
                  background:
                    level > 0.75 ? "#FF5A5A" : level > 0.02 ? "#00C851" : "#3A3A4A",
                }}
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#00D4FF]" />
              <span className="text-[12px] text-[#A0A0B0]">Waiting to watch</span>
            </div>
            <p className="mt-1 text-[30px] font-semibold tabular-nums tracking-[-0.03em] text-white">
              {waitingCount.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#6E6E80]">
              {waitingCount === 0
                ? "Nobody has registered for this session yet."
                : "They see the waiting room until you go live."}
            </p>
          </div>

          <label className="block">
            <span className="flex items-center gap-1.5 text-[12px] text-[#A0A0B0]">
              <Video className="h-3.5 w-3.5" />
              Camera
            </span>
            <select
              value={cameraId}
              onChange={(event) => {
                setCameraId(event.target.value);
                void start(event.target.value, micId || undefined);
              }}
              disabled={cameras.length === 0}
              className="mt-1.5 h-9 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12.5px] text-white focus:outline-none disabled:opacity-40"
            >
              {cameras.length === 0 && <option>No camera found</option>}
              {cameras.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="flex items-center gap-1.5 text-[12px] text-[#A0A0B0]">
              <Mic className="h-3.5 w-3.5" />
              Microphone
            </span>
            <select
              value={micId}
              onChange={(event) => {
                setMicId(event.target.value);
                void start(cameraId || undefined, event.target.value);
              }}
              disabled={mics.length === 0}
              className="mt-1.5 h-9 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12.5px] text-white focus:outline-none disabled:opacity-40"
            >
              {mics.length === 0 && <option>No microphone found</option>}
              {mics.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => {
              if (!ready) {
                toast.error("Allow camera and microphone access first.");
                return;
              }
              // The preview stream is released so LiveKit can claim the
              // devices — some browsers will not hand out a second handle.
              streamRef.current?.getTracks().forEach((track) => track.stop());
              onGoLive({ cameraId, micId });
            }}
            disabled={!ready || starting}
            title={ready ? undefined : "Allow camera and microphone access first"}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-all",
              ready
                ? "bg-[#FF3B3B] text-white shadow-[0_12px_36px_-10px_#FF3B3B] hover:bg-[#FF5A5A]"
                : "bg-[#1E1E2E] text-[#6E6E80]",
              "disabled:cursor-not-allowed"
            )}
          >
            <Radio className="h-4 w-4" />
            {starting ? "Going live…" : "Go live"}
          </button>

          <p className="text-[11.5px] leading-relaxed text-[#6E6E80]">
            Recording starts when you go live, not now — your device test stays out of
            the replay.
          </p>
        </aside>
      </div>
    </div>
  );
}
