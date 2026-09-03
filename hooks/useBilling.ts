"use client";

import { useCallback, useState } from "react";

import type { PlanSlug } from "@/lib/billing/plans";

/** Checkout and billing-portal actions, with the error surface they need. */
export function useBilling() {
  const [pending, setPending] = useState<PlanSlug | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (planSlug: PlanSlug, couponCode?: string) => {
      setPending(planSlug);
      setError(null);

      try {
        const response = await fetch("/api/billing/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planSlug, couponCode }),
        });

        const payload = (await response.json()) as { url?: string; error?: string };

        if (!response.ok || !payload.url) {
          setError(payload.error ?? "Could not start checkout.");
          setPending(null);
          return;
        }

        // Full navigation, not router.push — this leaves the app for Stripe.
        window.location.href = payload.url;
      } catch {
        setError("Could not reach the billing service.");
        setPending(null);
      }
    },
    []
  );

  const openPortal = useCallback(async () => {
    setPending("portal");
    setError(null);

    try {
      const response = await fetch("/api/billing/create-portal", { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Could not open the billing portal.");
        setPending(null);
        return;
      }
      window.location.href = payload.url;
    } catch {
      setError("Could not reach the billing service.");
      setPending(null);
    }
  }, []);

  return { startCheckout, openPortal, pending, error, setError };
}
