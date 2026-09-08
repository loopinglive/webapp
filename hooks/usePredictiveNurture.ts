"use client";

import { useCallback, useEffect, useState } from "react";

export type NurtureTouchpoint = {
  dayOffset: number;
  hour: number;
  channel: string;
  intent: string;
  subject: string;
  body: string;
  sentAt?: string | null;
};

export type NurtureSequence = {
  id: string;
  registrant_id: string | null;
  sequence_type: string;
  predicted_conversion_date: string | null;
  optimal_contact_times: number[];
  preferred_channel: string;
  touchpoints: NurtureTouchpoint[];
  status: string;
  messages_sent: number;
  last_message_sent_at: string | null;
  converted: boolean;
  created_at: string;
  registrants: { full_name: string; email: string } | null;
};

export function usePredictiveNurture(webinarId: string) {
  const [sequences, setSequences] = useState<NurtureSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/nurture?webinarId=${webinarId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { sequences: NurtureSequence[] };
      setSequences(payload.sequences);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function generate(): Promise<{ ok: boolean; created?: number; error?: string }> {
    setWorking(true);
    const response = await fetch("/api/nurture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { created?: number; error?: string };
    setWorking(false);
    if (!response.ok) return { ok: false, error: payload.error };
    await load();
    return { ok: true, created: payload.created };
  }

  async function setStatus(status: string, id?: string) {
    setWorking(true);
    await fetch("/api/nurture", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, status, ...(id ? { id } : {}) }),
    });
    setWorking(false);
    await load();
  }

  return { sequences, loading, working, generate, setStatus, reload: load };
}
