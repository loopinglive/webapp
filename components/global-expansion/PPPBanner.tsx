"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Globe2, X } from "lucide-react";

type PppInfo = { applies: boolean; countryName?: string; discountPercent?: number };

const DISMISS_KEY = "loopinglive-ppp-banner-dismissed";

/** "We offer localised pricing for your region" — shown on the pricing page when a PPP price is detected. */
export function PPPBanner() {
  const [info, setInfo] = useState<PppInfo | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setDismissed(window.localStorage.getItem(DISMISS_KEY) === "true");
      } catch {
        setDismissed(false);
      }
    }, 0);

    fetch("/api/payments/ppp")
      .then((response) => (response.ok ? response.json() : { applies: false }))
      .then(setInfo)
      .catch(() => setInfo({ applies: false }));

    return () => clearTimeout(timer);
  }, []);

  if (!info?.applies || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Reappears next visit — not worth failing over.
    }
  }

  return (
    <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-accent/25 bg-accent/[0.06] px-5 py-4">
      <div className="flex items-start gap-3">
        <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" />
        <div className="flex-1">
          <p className="text-[13.5px] leading-relaxed text-ink-muted">
            We offer localised pricing for {info.countryName} — prices shown below are
            adjusted{info.discountPercent ? ` by ${info.discountPercent}%` : ""} for your
            region.
          </p>
          <button
            onClick={() => setExpanded((value) => !value)}
            className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] text-accent-soft hover:text-accent"
          >
            How does this work?
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && (
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-faint">
              Loopinglive uses purchasing power parity pricing to make our platform
              accessible to creators everywhere. Your price is adjusted based on your
              local economy — the product is identical regardless of which price you
              pay.
            </p>
          )}
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-ink-faint hover:text-ink-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
