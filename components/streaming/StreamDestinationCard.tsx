import { Trash2 } from "lucide-react";

import { platformLabel } from "@/lib/live/platforms";
import type { StreamDestination } from "@/hooks/useMultiStream";

export function StreamDestinationCard({
  destination,
  onToggle,
  onRemove,
}: {
  destination: StreamDestination;
  onToggle: (isActive: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink">{platformLabel(destination.platform)}</p>
        <p className="mt-0.5 truncate font-mono text-[11.5px] text-ink-faint">
          {destination.rtmp_url} · {destination.stream_key_preview ?? "no key"}
        </p>
        {destination.last_streamed_at && (
          <p className="mt-0.5 text-[11px] text-ink-faint">
            Last streamed {new Date(destination.last_streamed_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <label className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted">
          <input
            type="checkbox"
            checked={destination.is_active}
            onChange={(event) => onToggle(event.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          Active
        </label>
        <button
          onClick={onRemove}
          aria-label="Remove destination"
          className="grid h-8 w-8 place-items-center rounded-lg border border-hairline text-ink-faint transition-colors hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
