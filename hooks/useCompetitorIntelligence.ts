"use client";

import { useCallback, useEffect, useState } from "react";

import type { Observation, PriceTrend } from "@/lib/intelligence/competitor-intelligence";

export type Competitor = {
  id: string;
  competitor_name: string;
  competitor_url: string | null;
  data_points: Observation[];
  last_analysed_at: string | null;
  created_at: string;
  trend: PriceTrend;
};

export function useCompetitorIntelligence() {
  const [competitors, setCompetitors] = useState<Competitor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/competitor-intelligence", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { competitors: Competitor[] };
      setCompetitors(payload.competitors);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const addCompetitor = useCallback(async (competitorName: string, competitorUrl: string) => {
    setAdding(true);
    setError(null);
    try {
      const response = await fetch("/api/competitor-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorName, competitorUrl: competitorUrl || null }),
      });
      if (!response.ok) {
        setError("Could not add that competitor.");
        return false;
      }
      await load();
      return true;
    } finally {
      setAdding(false);
    }
  }, [load]);

  const addObservation = useCallback(
    async (competitorId: string, input: { priceCents: number | null; offerHeadline: string; notes: string }) => {
      const response = await fetch(`/api/competitor-intelligence/${competitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (response.ok) await load();
    },
    [load]
  );

  const remove = useCallback(
    async (competitorId: string) => {
      const response = await fetch(`/api/competitor-intelligence/${competitorId}`, { method: "DELETE" });
      if (response.ok) await load();
    },
    [load]
  );

  return { competitors, loading, adding, error, addCompetitor, addObservation, remove };
}
