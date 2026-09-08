"use client";

import { useCallback, useEffect, useState } from "react";

export type CoHostPermissions = { chat: boolean; moderate: boolean; offers: boolean; analytics: boolean };

export type CoHost = {
  id: string;
  co_host_email: string | null;
  co_host_user_id: string | null;
  permissions: CoHostPermissions;
  status: string;
  invited_at: string | null;
  accepted_at: string | null;
  invite_expires_at: string | null;
};

export function useCoHosting(webinarId: string) {
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch(`/api/co-hosts?webinarId=${webinarId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { coHosts: CoHost[] };
      setCoHosts(payload.coHosts);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function invite(email: string, permissions: CoHostPermissions): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch("/api/co-hosts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, email, permissions }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    await load();
    return { ok: true };
  }

  async function revoke(id: string) {
    await fetch("/api/co-hosts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, webinarId }),
    });
    await load();
  }

  return { coHosts, loading, invite, revoke, reload: load };
}
