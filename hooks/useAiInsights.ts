"use client";

import { useCallback, useEffect, useState } from "react";

export type AiInsight = {
  id: string;
  insight_type: string;
  title: string;
  body: string;
  action_items: string[];
  priority: "low" | "medium" | "high";
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
};

export function useAiInsights(webinarId: string) {
  const [insights, setInsights] = useState<AiInsight[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/insights`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { insights: AiInsight[] };
      setInsights(payload.insights);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/admin/webinar/${webinarId}/insights`, { method: "POST" });
      if (response.ok) await load();
    } finally {
      setGenerating(false);
    }
  }, [webinarId, load]);

  const markRead = useCallback(
    async (insightId: string) => {
      await fetch(`/api/admin/webinar/${webinarId}/insights/${insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      setInsights((prev) => prev?.map((i) => (i.id === insightId ? { ...i, is_read: true } : i)) ?? null);
    },
    [webinarId]
  );

  const dismiss = useCallback(
    async (insightId: string) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/insights/${insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDismissed: true }),
      });
      if (response.ok) setInsights((prev) => prev?.filter((i) => i.id !== insightId) ?? null);
    },
    [webinarId]
  );

  return { insights, loading, generating, generate, markRead, dismiss };
}
