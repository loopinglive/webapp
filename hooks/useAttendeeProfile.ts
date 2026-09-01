"use client";

import { useCallback, useEffect, useState } from "react";

import type { AttendeeProfilePayload } from "@/types";

export function useAttendeeProfile(registrantId: string) {
  const [data, setData] = useState<AttendeeProfilePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/attendees/${registrantId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as AttendeeProfilePayload & {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Could not load this attendee.");
        return;
      }
      setData(payload);
      setError(null);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setIsLoading(false);
    }
  }, [registrantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const save = useCallback(
    async (patch: { notes?: string; tags?: string[] }) => {
      // Optimistic — notes save on blur and tags on click; neither should wait.
      setData((current) =>
        current
          ? {
              ...current,
              attendee: {
                ...current.attendee,
                ...(patch.notes !== undefined && { notes: patch.notes }),
                ...(patch.tags !== undefined && { tags: patch.tags }),
              },
            }
          : current
      );

      await fetch(`/api/admin/attendees/${registrantId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    },
    [registrantId]
  );

  return { data, isLoading, error, refetch: load, save };
}
