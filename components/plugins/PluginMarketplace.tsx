"use client";

import { useState } from "react";

import { PluginCard } from "@/components/plugins/PluginCard";
import { PluginDetail } from "@/components/plugins/PluginDetail";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { type MarketplacePlugin, usePlugins } from "@/hooks/usePlugins";

const CATEGORIES = ["engagement", "analytics", "integrations", "automation", "design", "utilities"] as const;

export function PluginMarketplace() {
  const { plugins, loadRegistry, install } = usePlugins();
  const toast = useToast();
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<MarketplacePlugin | null>(null);

  function selectCategory(value: string | null) {
    setCategory(value);
    void loadRegistry(value ?? undefined);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => selectCategory(null)}
          className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            category === null ? "bg-accent text-white" : "border border-hairline text-ink-muted hover:text-ink"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((option) => (
          <button
            key={option}
            onClick={() => selectCategory(option)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
              category === option ? "bg-accent text-white" : "border border-hairline text-ink-muted hover:text-ink"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!plugins ? (
          <SkeletonRows rows={4} columns={3} />
        ) : plugins.length === 0 ? (
          <EmptyState
            icon="🧩"
            title="No plugins here yet"
            description="Check back soon, or build one yourself from the developer portal."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plugins.map((plugin) => (
              <PluginCard key={plugin.id} plugin={plugin} onOpen={setOpen} />
            ))}
          </div>
        )}
      </div>

      {open && (
        <PluginDetail
          plugin={open}
          onClose={() => setOpen(null)}
          onInstall={async (pluginId) => {
            const result = await install(pluginId);
            if (result.ok) toast.success(`${open.name} installed.`);
            return result;
          }}
        />
      )}
    </div>
  );
}
