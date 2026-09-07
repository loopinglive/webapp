"use client";

import { useCallback, useEffect, useState } from "react";

import type { Condition } from "@/lib/intelligence/personalisation";

export type SmartSegment = {
  id: string;
  name: string;
  description: string | null;
  conditions: Condition[];
  registrant_count: number;
  last_evaluated_at: string | null;
  is_dynamic: boolean;
  created_at: string;
};

export type SegmentMember = { id: string; full_name: string; email: string };

export function useSmartSegments(webinarId: string) {
  const [segments, setSegments] = useState<SmartSegment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/segments`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { segments: SmartSegment[] };
      setSegments(payload.segments);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const createSegment = useCallback(
    async (input: { name: string; description: string; conditions: Condition[] }) => {
      setCreating(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/webinar/${webinarId}/segments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          setError("Could not create the segment.");
          return false;
        }
        await load();
        return true;
      } finally {
        setCreating(false);
      }
    },
    [webinarId, load]
  );

  const refresh = useCallback(
    async (segmentId: string) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/segments/${segmentId}`, {
        method: "PATCH",
      });
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  const remove = useCallback(
    async (segmentId: string) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/segments/${segmentId}`, {
        method: "DELETE",
      });
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  const fetchMembers = useCallback(
    async (segmentId: string) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/segments/${segmentId}/members`, {
        cache: "no-store",
      });
      if (!response.ok) return [];
      const payload = (await response.json()) as { members: SegmentMember[] };
      return payload.members;
    },
    [webinarId]
  );

  return { segments, loading, creating, error, createSegment, refresh, remove, fetchMembers };
}
