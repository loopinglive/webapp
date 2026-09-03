"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { PlanSlug } from "@/lib/billing/plans";

export type PlanState = {
  planSlug: PlanSlug;
  planName: string;
  isPaid: boolean;
  isFree: boolean;
  isExpired: boolean;
  isPastDue: boolean;
  isSuspended: boolean;
  canGoLive: boolean;
  canPublish: boolean;
  planExpiresAt: string | null;
  referralCode: string | null;
  isAdmin: boolean;
  fullName: string | null;
  email: string | null;
  loading: boolean;
  refresh: () => void;
};

const FALLBACK: Omit<PlanState, "refresh"> = {
  planSlug: "free",
  planName: "Free",
  isPaid: false,
  isFree: true,
  isExpired: false,
  isPastDue: false,
  isSuspended: false,
  canGoLive: false,
  canPublish: false,
  planExpiresAt: null,
  referralCode: null,
  isAdmin: false,
  fullName: null,
  email: null,
  loading: true,
};

const PlanContext = createContext<PlanState | null>(null);

/**
 * Holds plan state for the whole dashboard.
 *
 * Provided once at the layout so every Publish button and upgrade wall reads
 * the same answer — two components disagreeing about whether someone may go
 * live is the failure mode this prevents.
 */
export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(FALLBACK);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/billing/plan", { cache: "no-store" });
        if (!response.ok || cancelled) {
          if (!cancelled) setState((s) => ({ ...s, loading: false }));
          return;
        }
        const payload = (await response.json()) as Omit<PlanState, "refresh" | "loading">;
        if (!cancelled) setState({ ...payload, loading: false });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanState {
  const context = useContext(PlanContext);
  // Usable outside the provider (the marketing pages), where nobody is signed
  // in and the free defaults are the correct answer.
  return context ?? { ...FALLBACK, loading: false, refresh: () => {} };
}
