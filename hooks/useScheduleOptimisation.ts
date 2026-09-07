"use client";

import { useCallback, useEffect, useState } from "react";

import type { Recommendation, SlotStat } from "@/lib/intelligence/scheduling";

export type ScheduleOptimisation = {
  id: string;
  recommended_times: Recommendation[];
  analysis_data: SlotStat[];
  based_on_sessions: number;
  confidence_score: number | null;
  applied: boolean;
  created_at: string;
};

export function useScheduleOptimisation(webinarId: string) {
  const [latest, setLatest] = useState<ScheduleOptimisation | null | undefined>(undefined);
  const [computing, setComputing] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/scheduling`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { latest: ScheduleOptimisation | null };
      setLatest(payload.latest);
    }
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const compute = useCallback(async () => {
    setComputing(true);
    try {
      const response = await fetch(`/api/admin/webinar/${webinarId}/scheduling`, { method: "POST" });
      if (response.ok) await load();
    } finally {
      setComputing(false);
    }
  }, [webinarId, load]);

  const markApplied = useCallback(
    async (optimisationId: string) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/scheduling/${optimisationId}`, {
        method: "PATCH",
      });
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  return { latest, loading: latest === undefined, computing, compute, markApplied };
}
