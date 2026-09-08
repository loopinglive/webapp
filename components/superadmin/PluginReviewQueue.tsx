"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";

type Plugin = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  version: string;
  pricing_type: string;
  price: number;
  bundle_url: string;
  is_approved: boolean;
  is_active: boolean;
};

export function PluginReviewQueue() {
  const toast = useToast();
  const [status, setStatus] = useState<"pending" | "approved">("pending");
  const [plugins, setPlugins] = useState<Plugin[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/superadmin/plugins?status=${status}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { plugins: Plugin[] };
      setPlugins(payload.plugins);
    }
  }, [status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function act(pluginId: string, action: "approve" | "reject" | "deactivate") {
    setBusy(pluginId);
    const response = await fetch("/api/superadmin/plugins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pluginId, action }),
    });
    setBusy(null);
    if (!response.ok) {
      toast.error("That did not work.");
      return;
    }
    toast.success("Done.");
    await load();
  }

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-4 flex gap-1.5">
        {(["pending", "approved"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={`h-8 rounded-full px-3 text-[12.5px] capitalize transition-colors ${
              status === value ? "bg-[#6C47FF] text-white" : "text-[#A0A0B0] hover:text-white"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {!plugins ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
        </div>
      ) : plugins.length === 0 ? (
        <EmptyState
          icon="🧩"
          title={status === "pending" ? "Nothing waiting" : "Nothing approved yet"}
          description={status === "pending" ? "No plugins need review right now." : "Nothing has been approved yet."}
        />
      ) : (
        <ul className="space-y-2">
          {plugins.map((plugin) => (
            <li
              key={plugin.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-white">
                  {plugin.name} <span className="text-[#6E6E80]">v{plugin.version}</span>
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12px] text-[#A0A0B0]">{plugin.description}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-[#4A4A5C]">{plugin.bundle_url}</p>
              </div>

              <div className="flex shrink-0 gap-1.5">
                {status === "pending" ? (
                  <>
                    <button
                      onClick={() => act(plugin.id, "approve")}
                      disabled={busy === plugin.id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#22C55E]/15 px-3 text-[12px] text-[#22C55E] hover:bg-[#22C55E]/25 disabled:opacity-50"
                    >
                      {busy === plugin.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Approve
                    </button>
                    <button
                      onClick={() => act(plugin.id, "reject")}
                      disabled={busy === plugin.id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#FF5A5A]/15 px-3 text-[12px] text-[#FF5A5A] hover:bg-[#FF5A5A]/25 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                      Reject
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => act(plugin.id, "deactivate")}
                    disabled={busy === plugin.id}
                    className="inline-flex h-8 items-center rounded-lg border border-[#1E1E2E] px-3 text-[12px] text-[#A0A0B0] hover:text-white disabled:opacity-50"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
