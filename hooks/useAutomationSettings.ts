"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AutomationSettingsRow } from "@/types/database";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

type Available = { email: boolean; sms: boolean; whatsapp: boolean };
type Stats = { sent: number; failed: number; unsubscribed: number };

const AUTOSAVE_DELAY_MS = 2000;

export function useAutomationSettings(webinarId: string) {
  const [settings, setSettings] = useState<AutomationSettingsRow | null>(null);
  const [available, setAvailable] = useState<Available>({
    email: false,
    sms: false,
    whatsapp: false,
  });
  const [stats, setStats] = useState<Stats>({
    sent: 0,
    failed: 0,
    unsubscribed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Partial<AutomationSettingsRow>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/admin/automation/settings?webinarId=${webinarId}`,
          { cache: "no-store" }
        );
        const payload = (await response.json()) as {
          settings?: AutomationSettingsRow;
          available?: Available;
          stats?: Stats;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !payload.settings) {
          setError(payload.error ?? "Could not load automation settings.");
          return;
        }
        setSettings(payload.settings);
        if (payload.available) setAvailable(payload.available);
        if (payload.stats) setStats(payload.stats);
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
      const response = await fetch("/api/admin/automation/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webinarId, ...patch }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Those settings did not save.");
        setSaveStatus("error");
        return;
      }
      setError(null);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [webinarId]);

  const updateSettings = useCallback(
    (patch: Partial<AutomationSettingsRow>) => {
      setSettings((current) => (current ? { ...current, ...patch } : current));
      pending.current = { ...pending.current, ...patch };
      setSaveStatus("unsaved");

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush]
  );

  return {
    settings,
    updateSettings,
    available,
    stats,
    saveStatus,
    loading,
    error,
  };
}
