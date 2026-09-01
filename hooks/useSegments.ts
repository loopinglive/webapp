"use client";

import { useCallback, useEffect, useState } from "react";

import type { SegmentCounts } from "@/types";

const POLL_MS = 30_000;

/** Counts for the stat cards, refreshed while a session is running. */
export function useSegments(webinarId: string) {
  const [segments, setSegments] = useState<SegmentCounts>({ total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/attendees/segments?webinarId=${webinarId}`,
        { cache: "no-store" }
      );
      if (response.ok) setSegments((await response.json()) as SegmentCounts);
    } finally {
      setIsLoading(false);
    }
  }, [webinarId]);

  useEffect(() => {
    void load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { segments, isLoading, refetch: load };
}
