"use client";

import { useCallback, useEffect, useState } from "react";

import type { TeamRole } from "@/lib/teams/roles";

export type Team = {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  logo_url: string | null;
  plan_slug: string;
  max_members: number;
  max_webinars: number;
  subscription_status: string | null;
  stripe_customer_id: string | null;
};

/** The signed-in user's team, their role on it, and usage against its limits. */
export function useTeam(teamId: string | null) {
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [usage, setUsage] = useState<{ members: number; webinars: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const response = await fetch(`/api/teams/${teamId}`, { cache: "no-store" });
    const payload = (await response.json()) as {
      team?: Team;
      role?: TeamRole;
      usage?: { members: number; webinars: number };
      error?: string;
    };
    setLoading(false);

    if (!response.ok || !payload.team) {
      setError(payload.error ?? "Could not load this team.");
      return;
    }

    setError(null);
    setTeam(payload.team);
    setRole(payload.role ?? null);
    setUsage(payload.usage ?? null);
  }, [teamId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return { team, role, usage, loading, error, refresh: load };
}
