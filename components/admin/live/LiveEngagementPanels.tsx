"use client";

import { useEffect, useState } from "react";

import { PrivateMessagesAdmin } from "@/components/admin/live/PrivateMessagesAdmin";
import { RaisedHandsQueue } from "@/components/admin/live/RaisedHandsQueue";

/**
 * Reads the same live-state endpoint LiveStudio polls, just to find the
 * running session id — kept separate so a messaging bug can't take the
 * broadcast controls down with it.
 */
export function LiveEngagementPanels({ webinarId }: { webinarId: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch(`/api/live/${webinarId}`, { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const state = (await response.json()) as { live: { id: string } | null };
      setSessionId(state.live?.id ?? null);
    };
    void load();
    const poll = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [webinarId]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-ink">Raised hands</h2>
        <RaisedHandsQueue sessionId={sessionId} />
      </section>
      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-ink">Private messages</h2>
        <PrivateMessagesAdmin webinarId={webinarId} sessionId={sessionId} />
      </section>
    </div>
  );
}
