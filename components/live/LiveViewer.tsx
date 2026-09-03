"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  useConnectionState,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { Loader2, WifiOff } from "lucide-react";

/**
 * The attendee's view of a live broadcast.
 *
 * Slots into the same place the recorded player occupies, so everything around
 * it — chat, personas, timed comments, the offer button — is untouched. A live
 * session is a different video source, not a different room.
 */
export function LiveViewer({
  webinarId,
  registrantId,
  onUnavailable,
}: {
  webinarId: string;
  registrantId: string | null;
  onUnavailable: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`/api/live/${webinarId}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrantId }),
        });

        if (cancelled) return;

        const data = (await response.json()) as {
          live?: unknown;
          token?: string;
          serverUrl?: string;
        };

        // Nothing broadcasting: the watch room falls back to the recording.
        if (!data.live || !data.token || !data.serverUrl) {
          onUnavailable();
        } else {
          setToken(data.token);
          setServerUrl(data.serverUrl);
        }
      } catch {
        if (!cancelled) onUnavailable();
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [webinarId, registrantId, onUnavailable]);

  if (!checked) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (!token || !serverUrl) return null;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      // Attendees never publish. The token enforces it; this stops the browser
      // even asking for camera permission.
      video={false}
      audio={false}
      className="relative aspect-video overflow-hidden rounded-2xl bg-black"
    >
      <Stage />
    </LiveKitRoom>
  );
}

function Stage() {
  const connection = useConnectionState();
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);

  // Screen share wins when both are published — if a host is sharing, that is
  // what they want people looking at.
  const screen = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const camera = tracks.find((t) => t.source === Track.Source.Camera);
  const active = screen ?? camera;

  if (connection === ConnectionState.Connecting) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  // Say the connection dropped rather than showing a frozen frame and letting
  // someone assume it is their own network.
  if (connection === ConnectionState.Disconnected) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div>
          <WifiOff className="mx-auto h-5 w-5 text-[#FFB020]" />
          <p className="mt-3 text-[14px] text-white">The broadcast dropped</p>
          <p className="mt-1 text-[12.5px] text-[#A0A0B0]">
            Reconnecting automatically — no need to refresh.
          </p>
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <p className="text-[13.5px] text-[#A0A0B0]">
          The host is here but their camera is off.
        </p>
      </div>
    );
  }

  return (
    <>
      <VideoTrack trackRef={active} className="h-full w-full object-contain" />

      {/* Picture-in-picture of the host while they share a screen. */}
      {screen && camera && (
        <div className="absolute bottom-3 right-3 aspect-video w-[22%] min-w-[110px] overflow-hidden rounded-lg border border-white/15 shadow-lg">
          <VideoTrack trackRef={camera} className="h-full w-full object-cover" />
        </div>
      )}
    </>
  );
}
