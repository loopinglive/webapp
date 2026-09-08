"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, X } from "lucide-react";

import type { MarketplacePlugin } from "@/hooks/usePlugins";

const PERMISSION_LABEL: Record<string, string> = {
  "webinar:events:read": "Read webinar events (registrations, chat, purchases) as they happen",
  "chat:messages:write": "Send messages into the live chat",
  "ui:overlay:show": "Show visual overlays during your webinar",
  "registration:fields:read": "Read registration form field data",
  "analytics:read": "Read your webinar's analytics",
};

export function PluginDetail({
  plugin,
  onClose,
  onInstall,
}: {
  plugin: MarketplacePlugin;
  onClose: () => void;
  onInstall: (pluginId: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const permissions = plugin.manifest?.permissions ?? [];

  async function confirmInstall() {
    setInstalling(true);
    setError(null);
    const result = await onInstall(plugin.id);
    setInstalling(false);
    if (!result.ok) {
      setError(result.error ?? "Could not install that plugin.");
      return;
    }
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-surface"
      >
        <div className="flex items-start justify-between border-b border-hairline p-5">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">{plugin.name}</h2>
            <p className="mt-0.5 text-[12px] text-ink-faint">v{plugin.version}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-ink-faint hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          <p className="text-[13px] leading-relaxed text-ink-muted">{plugin.description}</p>

          {permissions.length > 0 && (
            <div className="mt-5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                <ShieldAlert className="h-3.5 w-3.5" />
                This plugin will be able to
              </p>
              <ul className="mt-2 space-y-1.5">
                {permissions.map((permission) => (
                  <li key={permission} className="text-[13px] leading-relaxed text-ink-muted">
                    • {PERMISSION_LABEL[permission] ?? permission}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="mt-4 text-[12.5px] text-[#FF6B6B]">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-hairline p-5">
          <span className="text-[14px] font-semibold text-ink">
            {plugin.pricing_type === "free" ? "Free" : `$${plugin.price}`}
          </span>
          <button
            onClick={confirmInstall}
            disabled={installing}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
          >
            {installing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {permissions.length > 0 ? "Approve & install" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
