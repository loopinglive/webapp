"use client";

import { useCallback, useEffect, useState } from "react";

export type CreatorProfile = {
  id: string;
  user_id: string;
  creator_handle: string | null;
  bio: string | null;
  niche: string | null;
  audience_size_estimate: number | null;
  verified: boolean;
  featured: boolean;
  total_webinars_hosted: number;
  total_attendees_served: number;
  total_revenue_generated: number;
  follower_count: number;
  public_profile_enabled: boolean;
  social_links: Record<string, string>;
};

export function useCreatorProfile() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/creators/profile", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { profile: CreatorProfile | null };
      setProfile(payload.profile);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function save(input: {
    creatorHandle: string;
    bio?: string;
    niche?: string;
    audienceSizeEstimate?: number;
    publicProfileEnabled: boolean;
    socialLinks?: Record<string, string>;
  }): Promise<{ ok: boolean; error?: string }> {
    const response = await fetch("/api/creators/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = (await response.json()) as { profile?: CreatorProfile; error?: string };
    if (!response.ok) return { ok: false, error: payload.error };
    setProfile(payload.profile ?? null);
    return { ok: true };
  }

  return { profile, loading, save, reload: load };
}
