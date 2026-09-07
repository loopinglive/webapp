"use client";

import { useCallback, useEffect, useState } from "react";

export const AB_TEST_TYPES = [
  { id: "confirmation_message", label: "Confirmation message" },
  { id: "reminder_subject_line", label: "Reminder subject line" },
  { id: "follow_up_sequence", label: "Follow-up sequence" },
  { id: "thank_you_page", label: "Thank-you page" },
] as const;

export type AbTestType = (typeof AB_TEST_TYPES)[number]["id"];

export type AbTest = {
  id: string;
  name: string;
  description: string | null;
  test_type: AbTestType;
  variant_a: { text?: string };
  variant_b: { text?: string };
  traffic_split: number;
  status: "draft" | "running" | "paused" | "completed";
  winner: "a" | "b" | null;
  confidence_level: number | null;
  created_at: string;
};

export type AbTestResults = {
  variants: { variant: "a" | "b"; impressions: number; conversions: number; conversionRate: number }[];
  significance: { zScore: number; confidenceLevel: number; significant: boolean };
  winner: "a" | "b" | null;
};

export function useAbTests(webinarId: string) {
  const [tests, setTests] = useState<AbTest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/ab-tests`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { tests: AbTest[] };
      setTests(payload.tests);
    } else {
      setError("Could not load tests.");
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const createTest = useCallback(
    async (input: {
      name: string;
      description: string;
      testType: AbTestType;
      variantAText: string;
      variantBText: string;
      trafficSplit: number;
    }) => {
      setCreating(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/webinar/${webinarId}/ab-tests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: input.name,
            description: input.description || null,
            testType: input.testType,
            variantA: { text: input.variantAText },
            variantB: { text: input.variantBText },
            trafficSplit: input.trafficSplit,
          }),
        });
        if (!response.ok) {
          setError("Could not create the test.");
          return false;
        }
        await load();
        return true;
      } finally {
        setCreating(false);
      }
    },
    [webinarId, load]
  );

  const setStatus = useCallback(
    async (testId: string, status: "running" | "paused" | "completed") => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/ab-tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  const remove = useCallback(
    async (testId: string) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/ab-tests/${testId}`, {
        method: "DELETE",
      });
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  const fetchResults = useCallback(
    async (testId: string) => {
      const response = await fetch(
        `/api/admin/webinar/${webinarId}/ab-tests/${testId}/results`,
        { cache: "no-store" }
      );
      if (!response.ok) return null;
      return (await response.json()) as AbTestResults;
    },
    [webinarId]
  );

  return { tests, loading, creating, error, createTest, setStatus, remove, fetchResults };
}
