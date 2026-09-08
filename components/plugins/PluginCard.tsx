import { Star } from "lucide-react";

import type { MarketplacePlugin } from "@/hooks/usePlugins";

export function PluginCard({
  plugin,
  onOpen,
}: {
  plugin: MarketplacePlugin;
  onOpen: (plugin: MarketplacePlugin) => void;
}) {
  return (
    <button
      onClick={() => onOpen(plugin)}
      className="flex flex-col rounded-2xl border border-hairline bg-surface p-5 text-left transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-[16px]">
          {plugin.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plugin.icon_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            "🧩"
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink">{plugin.name}</p>
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">{plugin.category}</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-[12.5px] leading-relaxed text-ink-muted">{plugin.description}</p>

      <div className="mt-4 flex items-center justify-between text-[12px] text-ink-faint">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3 fill-current text-[#FFD93D]" />
          {plugin.average_rating > 0 ? plugin.average_rating.toFixed(1) : "New"}
        </span>
        <span>{plugin.install_count.toLocaleString()} installs</span>
        <span className="font-medium text-ink">{plugin.pricing_type === "free" ? "Free" : `$${plugin.price}`}</span>
      </div>
    </button>
  );
}
