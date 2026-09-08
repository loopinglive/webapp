"use client";

import { useCallback, useEffect, useState } from "react";

export type StreamDestination = {
  id: string;
  platform: string;
  rtmp_url: string;
  is_active: boolean;
  last_streamed_at: string | null;
  stream_key_set: boolean;
  stream_key_preview: string | null;
};

export function useMultiStream(webinarId: string) {
  const [destinations, setDestinations] = useState<StreamDestination[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/streaming/destinations?webinarId=${webinarId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { destinations: StreamDestination[] };
      setDestinations(payload.destinations);
    } else {
      setDestinations([]);
    }
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function addDestination(input: { platform: string; rtmpUrl: string; streamKey: string }) {
    const response = await fetch("/api/streaming/destinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, ...input }),
    });
    const payload = (await response.json()) as { error?: string };
    if (response.ok) await load();
    return { ok: response.ok, error: payload.error };
  }

  async function removeDestination(destinationId: string) {
    await fetch("/api/streaming/destinations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinationId, webinarId }),
    });
    await load();
  }

  async function toggleDestination(destinationId: string, isActive: boolean) {
    await fetch("/api/streaming/destinations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinationId, webinarId, isActive }),
    });
    await load();
  }

  return { destinations, addDestination, removeDestination, toggleDestination, reload: load };
}
