"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GenerationLogEntry = { step: string; status: string; at: string; detail?: string };

export type AutonomousJob = {
  id: string;
  generation_status: string;
  script_generated_at: string | null;
  presentation_generated_at: string | null;
  voice_cloned_at: string | null;
  video_assembled_at: string | null;
  personas_generated_at: string | null;
  automation_configured_at: string | null;
  published_at: string | null;
  generation_log: GenerationLogEntry[];
  estimated_completion_minutes: number | null;
  error: string | null;
  created_at: string;
};

export type AutonomousWebinarSummary = {
  title: string;
  status: "draft" | "published";
  video_url: string | null;
  thumbnail_url: string | null;
};

export type PremiumVoice = { id: string; name: string; gender: "male" | "female"; accent: string };

export function useVoiceOptions() {
  const [voices, setVoices] = useState<PremiumVoice[]>([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch("/api/autonomous/voices", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { voices?: PremiumVoice[]; configured?: boolean } | null) => {
          if (!payload) return;
          setVoices(payload.voices ?? []);
          setConfigured(payload.configured ?? true);
        })
        .catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return { voices, configured };
}

/** Polls a generation job's status every few seconds while it's still running. */
export function useAutonomousStatus(webinarId: string) {
  const [job, setJob] = useState<AutonomousJob | null>(null);
  const [webinar, setWebinar] = useState<AutonomousWebinarSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/autonomous/status?webinarId=${webinarId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as {
      job?: AutonomousJob;
      webinar?: AutonomousWebinarSummary;
      error?: string;
    };
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not load generation status.");
      return null;
    }
    setError(null);
    setJob(payload.job ?? null);
    setWebinar(payload.webinar ?? null);
    return payload.job ?? null;
  }, [webinarId]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const current = await load();
      if (cancelled) return;
      const finished = current && (current.generation_status === "ready" || current.generation_status === "failed");
      if (!finished) timerRef.current = setTimeout(() => void tick(), 4000);
    }

    const initial = setTimeout(() => void tick(), 0);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [load]);

  return { job, webinar, loading, error, reload: load };
}
