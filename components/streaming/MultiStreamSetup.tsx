"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { StreamDestinationCard } from "@/components/streaming/StreamDestinationCard";
import { StreamKeyInput } from "@/components/streaming/StreamKeyInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { useMultiStream } from "@/hooks/useMultiStream";
import { STREAM_PLATFORMS } from "@/lib/live/platforms";

export function MultiStreamSetup({ webinarId }: { webinarId: string }) {
  const { destinations, addDestination, removeDestination, toggleDestination } = useMultiStream(webinarId);
  const toast = useToast();

  const [platform, setPlatform] = useState<(typeof STREAM_PLATFORMS)[number]["id"]>("youtube");
  const [rtmpUrl, setRtmpUrl] = useState<string>(STREAM_PLATFORMS[0].rtmpUrl);
  const [streamKey, setStreamKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectPlatform(id: (typeof STREAM_PLATFORMS)[number]["id"]) {
    setPlatform(id);
    setRtmpUrl(STREAM_PLATFORMS.find((option) => option.id === id)?.rtmpUrl ?? "");
  }

  async function submit() {
    setError(null);
    if (!rtmpUrl.trim() || !streamKey.trim()) {
      setError("An RTMP URL and stream key are both required.");
      return;
    }

    setSaving(true);
    const result = await addDestination({ platform, rtmpUrl: rtmpUrl.trim(), streamKey: streamKey.trim() });
    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Could not save that destination.");
      return;
    }
    setStreamKey("");
    toast.success("Destination added.");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="text-[14px] font-semibold text-ink">Add a destination</h2>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {STREAM_PLATFORMS.map((option) => (
            <button
              key={option.id}
              onClick={() => selectPlatform(option.id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                platform === option.id ? "bg-accent text-white" : "border border-hairline text-ink-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11.5px] text-ink-faint">RTMP URL</span>
            <input
              value={rtmpUrl}
              onChange={(event) => setRtmpUrl(event.target.value)}
              placeholder="rtmp://…"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-void px-3 font-mono text-[12.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block">
            <span className="text-[11.5px] text-ink-faint">Stream key</span>
            <div className="mt-1">
              <StreamKeyInput value={streamKey} onChange={setStreamKey} />
            </div>
          </label>
        </div>

        {error && <p className="mt-2 text-[12px] text-[#FF6B6B]">{error}</p>}

        <button
          onClick={submit}
          disabled={saving}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add destination
        </button>
      </div>

      {!destinations ? null : destinations.length === 0 ? (
        <EmptyState
          icon="📡"
          title="No destinations yet"
          description="Add YouTube, Facebook, LinkedIn, Twitch, or a custom RTMP endpoint to stream to it alongside Loopinglive."
        />
      ) : (
        <div className="space-y-2">
          {destinations.map((destination) => (
            <StreamDestinationCard
              key={destination.id}
              destination={destination}
              onToggle={(isActive) => void toggleDestination(destination.id, isActive)}
              onRemove={() => void removeDestination(destination.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
