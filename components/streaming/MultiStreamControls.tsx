"use client";

import { useState } from "react";
import { Loader2, Radio, Square } from "lucide-react";

import { StreamStatusMonitor } from "@/components/streaming/StreamStatusMonitor";
import { useToast } from "@/components/ui/ToastProvider";
import { useMultiStream } from "@/hooks/useMultiStream";

/**
 * Lives on the live-session admin page. Only appears once destinations
 * exist — a host who has not set any up sees nothing extra here, matching
 * the Phase 14 rule that multi-streaming is opt-in and live-mode-only.
 *
 * `streaming` intentionally starts false on every mount rather than being
 * restored from the server: this page is always scoped to one webinarId
 * (the route itself), so a fresh mount always means a fresh visit to this
 * webinar's Go Live tab, not a mid-stream navigation to preserve state across.
 */
export function MultiStreamControls({ webinarId }: { webinarId: string }) {
  const { destinations } = useMultiStream(webinarId);
  const toast = useToast();
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!destinations || destinations.filter((destination) => destination.is_active).length === 0) {
    return null;
  }

  async function start() {
    setBusy(true);
    const response = await fetch("/api/streaming/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not start streaming.");
      return;
    }
    setStreaming(true);
    toast.success("Streaming to all active destinations.");
  }

  async function stop() {
    setBusy(true);
    await fetch("/api/streaming/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId }),
    });
    setBusy(false);
    setStreaming(false);
    toast.success("Streaming stopped.");
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink">Multi-platform streaming</h3>
        {streaming ? (
          <button
            onClick={stop}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#FF5A5A]/40 px-3 text-[12px] font-medium text-[#FF5A5A] disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
            Stop
          </button>
        ) : (
          <button
            onClick={start}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3 text-[12px] font-medium text-white disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Radio className="h-3 w-3" />}
            Start streaming to all
          </button>
        )}
      </div>

      <div className="mt-3">
        <StreamStatusMonitor webinarId={webinarId} active={streaming} />
      </div>
    </div>
  );
}
