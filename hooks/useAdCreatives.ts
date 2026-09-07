"use client";

import { useCallback, useEffect, useState } from "react";

export const AD_PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "google", label: "Google" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "tiktok", label: "TikTok" },
] as const;

export type AdPlatform = (typeof AD_PLATFORMS)[number]["id"];

export type AdCreative = {
  id: string;
  platform: string;
  format: string;
  headline: string;
  primary_text: string;
  description: string | null;
  call_to_action: string;
  generated_by_ai: boolean;
  status: "draft" | "approved" | "archived";
  created_at: string;
};

export function useAdCreatives(webinarId: string) {
  const [creatives, setCreatives] = useState<AdCreative[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/ad-creatives`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { creatives: AdCreative[] };
      setCreatives(payload.creatives);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const generate = useCallback(
    async (platform: AdPlatform, targetAudience: string, count: number) => {
      setGenerating(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/webinar/${webinarId}/ad-creatives`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, targetAudience, count }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          setError(payload.error ?? "Could not generate ad copy.");
          return false;
        }
        await load();
        return true;
      } finally {
        setGenerating(false);
      }
    },
    [webinarId, load]
  );

  const update = useCallback(
    async (creativeId: string, patch: Partial<Pick<AdCreative, "headline" | "primary_text" | "description" | "call_to_action" | "status">>) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/ad-creatives/${creativeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: patch.headline,
          primaryText: patch.primary_text,
          description: patch.description,
          callToAction: patch.call_to_action,
          status: patch.status,
        }),
      });
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  const remove = useCallback(
    async (creativeId: string) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/ad-creatives/${creativeId}`, {
        method: "DELETE",
      });
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  return { creatives, loading, generating, error, generate, update, remove };
}
