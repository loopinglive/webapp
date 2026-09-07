"use client";

import { useCallback, useEffect, useState } from "react";

import type { Condition, PersonalisationAction, PersonalisationContext } from "@/lib/intelligence/personalisation";

export type PersonalisationRule = {
  id: string;
  rule_name: string;
  conditions: Condition[];
  actions: PersonalisationAction[];
  priority: number;
  is_active: boolean;
  created_at: string;
};

export function usePersonalisationRules(webinarId: string) {
  const [rules, setRules] = useState<PersonalisationRule[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/personalisation`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { rules: PersonalisationRule[] };
      setRules(payload.rules);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const createRule = useCallback(
    async (input: { ruleName: string; conditions: Condition[]; actions: PersonalisationAction[]; priority: number }) => {
      setCreating(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/webinar/${webinarId}/personalisation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          setError("Could not create the rule.");
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

  const toggleActive = useCallback(
    async (ruleId: string, isActive: boolean) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/personalisation/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  const remove = useCallback(
    async (ruleId: string) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/personalisation/${ruleId}`, {
        method: "DELETE",
      });
      if (response.ok) await load();
    },
    [webinarId, load]
  );

  const preview = useCallback(
    async (context: PersonalisationContext) => {
      const response = await fetch(`/api/admin/webinar/${webinarId}/personalisation/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        matched: { ruleId: string; ruleName: string; actions: PersonalisationAction[] } | null;
      };
      return payload.matched;
    },
    [webinarId]
  );

  return { rules, loading, creating, error, createRule, toggleActive, remove, preview };
}
