"use client";

import { useCallback, useEffect, useState } from "react";

export type MarketplacePlugin = {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: string;
  category: string;
  icon_url: string | null;
  screenshots: string[];
  pricing_type: string;
  price: number;
  install_count: number;
  average_rating: number;
  manifest: { permissions?: string[] } | null;
};

export type PluginSettingField = {
  type: "string" | "number" | "boolean" | "select" | "multiselect";
  label: string;
  default?: unknown;
  options?: string[];
};

export type PluginInstallation = {
  id: string;
  plugin_id: string;
  webinar_id: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  installed_at: string;
  plugin: {
    name: string;
    slug: string;
    icon_url: string | null;
    category: string;
    manifest: { settings_schema?: Record<string, PluginSettingField> } | null;
  } | null;
};

export function usePlugins() {
  const [plugins, setPlugins] = useState<MarketplacePlugin[] | null>(null);
  const [installations, setInstallations] = useState<PluginInstallation[] | null>(null);

  const loadRegistry = useCallback(async (category?: string) => {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const response = await fetch(`/api/plugins/registry${query}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { plugins: MarketplacePlugin[] };
      setPlugins(payload.plugins);
    } else {
      setPlugins([]);
    }
  }, []);

  const loadInstallations = useCallback(async () => {
    const response = await fetch("/api/plugins/install", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { installations: PluginInstallation[] };
      setInstallations(payload.installations);
    } else {
      setInstallations([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRegistry();
      void loadInstallations();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRegistry, loadInstallations]);

  async function install(pluginId: string, webinarId?: string): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch("/api/plugins/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pluginId, webinarId }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    await loadInstallations();
    return { ok: true };
  }

  async function uninstall(installationId: string) {
    await fetch("/api/plugins/uninstall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installationId }),
    });
    await loadInstallations();
  }

  return { plugins, installations, loadRegistry, install, uninstall };
}
