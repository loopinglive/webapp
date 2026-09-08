"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type StatusDestination = { url: string; platform: string; status: string; error: string | null };

export function StreamStatusMonitor({ webinarId, active }: { webinarId: string; active: boolean }) {
  const [destinations, setDestinations] = useState<StatusDestination[] | null>(null);

  useEffect(() => {
    if (!active) {
      const timer = setTimeout(() => setDestinations(null), 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    async function poll() {
      const response = await fetch(`/api/streaming/status?webinarId=${webinarId}`, { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const payload = (await response.json()) as { live: boolean; destinations: StatusDestination[] };
      setDestinations(payload.destinations);
    }

    void poll();
    const interval = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [webinarId, active]);

  if (!active || !destinations || destinations.length === 0) return null;

  return (
    <div className="rounded-xl border border-hairline bg-surface p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Stream health</p>
      <ul className="mt-2 space-y-1.5">
        {destinations.map((destination) => {
          const ok = destination.status.toLowerCase().includes("active") && !destination.error;
          return (
            <li key={destination.url} className="flex items-center gap-2 text-[12px]">
              {destination.error ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#FF6B6B]" />
              ) : ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-faint" />
              )}
              <span className="text-ink-muted">{destination.platform}</span>
              <span className="ml-auto text-ink-faint">{destination.error ?? destination.status}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
