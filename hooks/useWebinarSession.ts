"use client";

import { useCallback, useEffect, useState } from "react";

import type { SessionPayload } from "@/types";

type State = {
  data: SessionPayload | null;
  loading: boolean;
  error: string | null;
  /** serverTime − device clock, in ms. Add it to Date.now() for the true time. */
  clockOffsetMs: number;
  refresh: () => Promise<void>;
};

export function useWebinarSession(webinarId: string): State {
  const [data, setData] = useState<SessionPayload | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/webinar/${webinarId}/session`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as SessionPayload & { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not load this webinar.");
        setData(null);
        return;
      }

      setClockOffsetMs(new Date(payload.serverTime).getTime() - Date.now());
      setData(payload);
      setError(null);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [webinarId]);

  useEffect(() => {
    // The clock delta can only be measured in the browser — it is the gap
    // between this device and the server's response — so the first read has to
    // happen here rather than during a server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { data, loading, error, clockOffsetMs, refresh: load };
}
