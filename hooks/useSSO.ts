"use client";

import { useCallback, useEffect, useState } from "react";

export type SsoConfig = {
  id: string;
  provider: string;
  entity_id: string | null;
  sso_url: string;
  attribute_mapping: Record<string, string>;
  is_active: boolean;
  require_sso: boolean;
};

export function useSSO(teamId: string) {
  const [config, setConfig] = useState<SsoConfig | null>(null);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch(`/api/sso/config?teamId=${teamId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { config: SsoConfig | null; isEnterprise: boolean };
      setConfig(payload.config);
      setIsEnterprise(payload.isEnterprise);
    }
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function save(input: {
    provider: string;
    entityId?: string;
    ssoUrl: string;
    certificate: string;
    attributeMapping?: Record<string, string>;
    requireSso: boolean;
  }): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch("/api/sso/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, ...input }),
    });
    const payload = (await response.json()) as { config?: SsoConfig; error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    await load();
    return { ok: true };
  }

  async function remove() {
    await fetch("/api/sso/config", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    await load();
  }

  async function forceLogout(): Promise<number> {
    const response = await fetch("/api/sso/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId }),
    });
    const payload = (await response.json()) as { sessionsExpired?: number };
    return payload.sessionsExpired ?? 0;
  }

  return { config, isEnterprise, loading, save, remove, forceLogout };
}
