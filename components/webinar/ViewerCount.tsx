"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

const POLL_MS = 30_000;

export function ViewerCount({
  webinarId,
  sessionId,
}: {
  webinarId: string;
  sessionId: string | null;
}) {
  const [viewers, setViewers] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/webinar/${webinarId}/attendance?sessionId=${sessionId}`,
          { cache: "no-store" }
        );
        if (!response.ok || cancelled) return;
        const { viewers: count } = (await response.json()) as { viewers: number };
        setViewers(count);
      } catch {
        // Keep the last known figure.
      }
    };

    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [webinarId, sessionId]);

  if (viewers === null) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1E1E2E] bg-[#12121A]/80 px-3 py-1.5 text-[11.5px] font-medium text-[#A0A0B0] backdrop-blur-xl">
      <Users className="h-3 w-3" />
      <span className="tabular-nums text-white">{viewers.toLocaleString()}</span>
      watching
    </span>
  );
}
