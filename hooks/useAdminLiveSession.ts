"use client";

import { useEffect, useRef, useState } from "react";

import type { AdminSessionPayload } from "@/types";

export function useAdminLiveSession(sessionId: string) {
  const [sessionData, setSessionData] = useState<AdminSessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const joined = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/admin/session?sessionId=${sessionId}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as AdminSessionPayload & {
          error?: string;
        };

        if (cancelled) return;
        if (!response.ok) {
          setError(payload.error ?? "Could not load this session.");
          return;
        }
        setSessionData(payload);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Presence — recorded in admin_sessions so we know who was watching when.
  useEffect(() => {
    if (joined.current) return;
    joined.current = true;

    const post = (action: "join" | "leave") =>
      fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action }),
        keepalive: true,
      }).catch(() => {});

    void post("join");

    const onLeave = () => void post("leave");
    window.addEventListener("pagehide", onLeave);

    return () => {
      window.removeEventListener("pagehide", onLeave);
      onLeave();
    };
  }, [sessionId]);

  return { sessionData, loading, error, isConnected: Boolean(sessionData) };
}
