"use client";

import { useEffect, useState } from "react";

export type LocalisedPrice = { amount: number; currency: string; symbol: string };

export type LocalisedPricing = {
  country: string | null;
  countryName: string | null;
  currency: string;
  symbol: string;
  isPPP: boolean;
  pppFactor: number;
  paymentMethods: string[];
  prices: Record<string, LocalisedPrice>;
  standardPrices: Record<string, LocalisedPrice>;
};

const STORAGE_KEY = "loopinglive-currency-override";

/** Detected (or manually overridden) local pricing for the paid plans. */
export function useLocalisedPricing() {
  const [pricing, setPricing] = useState<LocalisedPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideCountry, setOverrideCountry] = useState<string | null>(null);
  const [storageRead, setStorageRead] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setOverrideCountry(window.localStorage.getItem(STORAGE_KEY));
      } catch {
        // Storage disabled — auto-detection still works for this load.
      }
      setStorageRead(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageRead) return;
    let cancelled = false;

    const timer = setTimeout(() => {
      setLoading(true);

      const query = overrideCountry ? `?country=${encodeURIComponent(overrideCountry)}` : "";
      fetch(`/api/payments/currency${query}`, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: LocalisedPricing | null) => {
          if (!cancelled) setPricing(data);
        })
        .catch(() => {
          if (!cancelled) setPricing(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [overrideCountry, storageRead]);

  function setCountry(countryCode: string | null) {
    setOverrideCountry(countryCode);
    try {
      if (countryCode) window.localStorage.setItem(STORAGE_KEY, countryCode);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-persistent for this session only — still applies immediately.
    }
  }

  return { pricing, loading, setCountry, overrideCountry };
}
