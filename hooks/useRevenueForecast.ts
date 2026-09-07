"use client";

import { useCallback, useEffect, useState } from "react";

import type { Forecast } from "@/lib/intelligence/forecasting";

export type RevenueForecast = {
  id: string;
  forecast_period: string;
  forecast_type: string;
  predicted_registrants: number | null;
  predicted_attendees: number | null;
  predicted_conversions: number | null;
  predicted_revenue: number | null;
  confidence_interval_low: number | null;
  confidence_interval_high: number | null;
  created_at: string;
};

export type ForecastBreakdown = {
  registrants: Forecast;
  attendees: Forecast;
  conversions: Forecast;
  revenue: Forecast;
};

export function useRevenueForecast() {
  const [latest, setLatest] = useState<RevenueForecast | null | undefined>(undefined);
  const [breakdown, setBreakdown] = useState<ForecastBreakdown | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/revenue-forecast", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { latest: RevenueForecast | null };
      setLatest(payload.latest);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const generate = useCallback(async (periodDays: number) => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/revenue-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "Could not generate a forecast.");
        return;
      }
      const payload = (await response.json()) as { forecast: RevenueForecast; breakdown: ForecastBreakdown };
      setLatest(payload.forecast);
      setBreakdown(payload.breakdown);
    } finally {
      setGenerating(false);
    }
  }, []);

  return { latest, loading: latest === undefined, breakdown, generating, error, generate };
}
