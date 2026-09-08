"use client";

import { useCallback, useEffect, useState } from "react";

export type Partnership = {
  id: string;
  partner_platform_url: string;
  partnership_type: string;
  shared_audience: boolean;
  shared_analytics: boolean;
  cross_promotion_enabled: boolean;
  status: string;
  last_verified_at: string | null;
  hasPartnerKey: boolean;
  created_at: string;
};

export function useFederation() {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/federation", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { partnerships: Partnership[]; configured: boolean };
      setPartnerships(payload.partnerships);
      setConfigured(payload.configured);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function create(input: {
    partnerPlatformUrl: string;
    partnershipType: string;
    partnerApiKey?: string;
  }): Promise<{ ok: boolean; issuedKey?: string; error?: string }> {
    const response = await fetch("/api/federation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = (await response.json().catch(() => ({}))) as { issuedKey?: string; error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    await load();
    return { ok: true, issuedKey: payload.issuedKey };
  }

  async function savePartnerKey(id: string, partnerApiKey: string) {
    await fetch("/api/federation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, partnerApiKey }),
    });
    await load();
  }

  async function verify(id: string): Promise<{ ok: boolean; message: string }> {
    const response = await fetch("/api/federation/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "ping" }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      status?: number;
      response?: { error?: string; platform?: string };
      error?: string;
    };
    await load();

    if (!response.ok) return { ok: false, message: payload.error ?? "Could not reach the partner." };
    if (!payload.ok) {
      return { ok: false, message: payload.response?.error ?? `Partner replied ${payload.status}.` };
    }
    return { ok: true, message: `Connected to ${payload.response?.platform ?? "the partner"}.` };
  }

  async function remove(id: string) {
    await fetch("/api/federation", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return { partnerships, configured, loading, create, savePartnerKey, verify, remove, reload: load };
}
