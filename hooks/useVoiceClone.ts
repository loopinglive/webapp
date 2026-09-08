"use client";

import { useCallback, useEffect, useState } from "react";

export type VoiceClone = {
  id: string;
  clone_name: string;
  provider_voice_id: string;
  status: string;
  is_primary: boolean;
  created_at: string;
};

export function useVoiceClone() {
  const [clones, setClones] = useState<VoiceClone[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/voice-clone", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { clones: VoiceClone[] };
      setClones(payload.clones);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function createClone(publicId: string, cloneName: string): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch("/api/voice-clone/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, cloneName }),
    });
    const payload = (await response.json().catch(() => ({}))) as { clone?: VoiceClone; error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    await load();
    return { ok: true };
  }

  async function removeClone(id: string): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch("/api/voice-clone", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    await load();
    return { ok: true };
  }

  async function makePrimary(id: string): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch("/api/voice-clone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    await load();
    return { ok: true };
  }

  async function test(voiceCloneId: string, text: string): Promise<{ ok: boolean; audioUrl?: string; error?: string }> {
    const response = await fetch("/api/voice-clone/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voiceCloneId, text }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: payload.error };
    }
    const blob = await response.blob();
    return { ok: true, audioUrl: URL.createObjectURL(blob) };
  }

  return { clones, loading, createClone, removeClone, makePrimary, test, reload: load };
}
