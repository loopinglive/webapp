"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type QueueItem = {
  id: string;
  registrantId: string;
  name: string;
  raisedAt: string;
  acknowledged: boolean;
};

/** Admin-side: the live queue of raised hands for a session. */
export function useRaisedHands(sessionId: string | null) {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const response = await fetch(`/api/webinar/raise-hand?sessionId=${sessionId}`, { cache: "no-store" });
    if (response.ok) {
      const { queue: rows } = (await response.json()) as { queue: QueueItem[] };
      setQueue(rows);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const timer = setTimeout(() => void load(), 0);

    const supabase = createClient();
    const channel = supabase
      .channel(`raised-hands:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raised_hands", filter: `session_id=eq.${sessionId}` },
        () => void load()
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, load]);

  async function acknowledge(registrantId: string) {
    if (!sessionId) return;
    await fetch(`/api/webinar/raise-hand`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, registrantId }),
    });
  }

  return { queue, acknowledge };
}
