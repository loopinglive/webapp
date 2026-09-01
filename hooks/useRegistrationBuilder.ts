"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RegistrationConfig } from "@/types";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

const AUTOSAVE_DELAY_MS = 2000;

/**
 * Builder state, and the gap between preview and live.
 *
 * Every edit lands in local state immediately so the preview is instant, and
 * reaches the database two seconds after typing stops. The attendee-facing page
 * only ever reads what has been saved.
 */
export function useRegistrationBuilder(webinarId: string) {
  const [config, setConfig] = useState<RegistrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Partial<RegistrationConfig>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/admin/registration/config?webinarId=${webinarId}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as {
          config?: RegistrationConfig;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !payload.config) {
          setError(payload.error ?? "Could not load the page settings.");
          return;
        }
        setConfig(payload.config);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [webinarId]);

  const flush = useCallback(async () => {
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};

    setSaveStatus("saving");
    try {
      const response = await fetch("/api/admin/registration/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webinarId, ...patch }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Those changes did not save.");
        setSaveStatus("error");
        return;
      }
      setError(null);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [webinarId]);

  const updateConfig = useCallback(
    (patch: Partial<RegistrationConfig>) => {
      setConfig((current) => (current ? { ...current, ...patch } : current));
      pending.current = { ...pending.current, ...patch };
      setSaveStatus("unsaved");

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush]
  );

  // Never lose the last couple of seconds of edits on navigation.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush]
  );

  return {
    config,
    updateConfig,
    saveNow: flush,
    saveStatus,
    loading,
    error,
  };
}
