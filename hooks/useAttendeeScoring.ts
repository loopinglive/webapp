"use client";

import { useCallback, useEffect, useState } from "react";

import type { ScoreContribution } from "@/lib/intelligence/scoring";

export type ScoredRegistrant = {
  registrant_id: string;
  engagement_score: number;
  conversion_likelihood: number;
  churn_risk: number;
  lifetime_value_estimate: number;
  scored_at: string;
  score_factors: {
    contributions: ScoreContribution[];
    available: Record<string, boolean>;
  } | null;
  registrant: {
    id: string;
    full_name: string;
    email: string;
    watch_percentage: number | null;
    clicked_offer: boolean;
  } | null;
};

export type ScoringSummary = {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  averageScore: number;
};

/** The scoring leaderboard for one webinar, plus the actions that refresh it. */
export function useAttendeeScoring(webinarId: string) {
  const [rows, setRows] = useState<ScoredRegistrant[] | null>(null);
  const [summary, setSummary] = useState<ScoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch(
      `/api/intelligence/scoring?webinarId=${webinarId}`,
      { cache: "no-store" }
    );
    if (response.ok) {
      const payload = (await response.json()) as {
        rows: ScoredRegistrant[];
        summary: ScoringSummary;
      };
      setRows(payload.rows);
      setSummary(payload.summary);
    } else {
      setError("Could not load the scoring leaderboard.");
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const rescoreAll = useCallback(async () => {
    setRescoring(true);
    setError(null);
    try {
      const response = await fetch("/api/intelligence/scoring/batch-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webinarId }),
      });
      if (!response.ok) {
        setError("Rescoring failed.");
        return;
      }
      await load();
    } finally {
      setRescoring(false);
    }
  }, [webinarId, load]);

  const rescoreOne = useCallback(
    async (registrantId: string) => {
      const response = await fetch("/api/intelligence/scoring/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrantId }),
      });
      if (response.ok) await load();
    },
    [load]
  );

  return { rows, summary, loading, rescoring, error, rescoreAll, rescoreOne };
}
