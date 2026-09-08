"use client";

import { useCallback, useEffect, useState } from "react";

export type PipelineStage = { key: string; label: string; probability: number };

export type Pipeline = {
  id: string;
  name: string;
  stages: PipelineStage[];
  is_default: boolean;
  created_at: string;
};

export type Deal = {
  id: string;
  webinar_id: string | null;
  registrant_id: string | null;
  title: string;
  value: number;
  stage: string;
  probability: number;
  expected_close_date: string | null;
  notes: string | null;
  activities: { at: string; type: string; detail: string }[];
  won: boolean;
  lost: boolean;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  registrants: { full_name: string; email: string } | null;
};

export function useDealPipeline() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeals = useCallback(async (pipelineId: string) => {
    const response = await fetch(`/api/crm/deals?pipelineId=${pipelineId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { deals: Deal[] };
      setDeals(payload.deals);
    }
  }, []);

  const load = useCallback(async () => {
    const response = await fetch("/api/crm/pipelines", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { pipelines: Pipeline[] };
      const first = payload.pipelines.find((row) => row.is_default) ?? payload.pipelines[0] ?? null;
      setPipeline(first);
      if (first) await loadDeals(first.id);
    }
    setLoading(false);
  }, [loadDeals]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  /** Moves a card immediately, then persists — a Kanban that lags on drop feels broken. */
  async function moveDeal(dealId: string, stage: string, probability: number) {
    setDeals((current) => current.map((deal) => (deal.id === dealId ? { ...deal, stage, probability } : deal)));
    await fetch("/api/crm/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dealId, stage, probability }),
    });
    if (pipeline) await loadDeals(pipeline.id);
  }

  async function markDeal(dealId: string, outcome: "won" | "lost", lostReason?: string) {
    await fetch("/api/crm/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dealId, [outcome]: true, ...(lostReason ? { lostReason } : {}) }),
    });
    if (pipeline) await loadDeals(pipeline.id);
  }

  async function createDeal(input: { title: string; value: number; stage: string }): Promise<{ ok: boolean; error?: string }> {
    if (!pipeline) return { ok: false, error: "No pipeline yet." };
    const response = await fetch("/api/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineId: pipeline.id, ...input }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    await loadDeals(pipeline.id);
    return { ok: true };
  }

  async function removeDeal(dealId: string) {
    await fetch("/api/crm/deals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dealId }),
    });
    if (pipeline) await loadDeals(pipeline.id);
  }

  return { pipeline, deals, loading, moveDeal, markDeal, createDeal, removeDeal, reload: load };
}
