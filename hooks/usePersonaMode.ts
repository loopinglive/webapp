"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { PersonaMode, PersonaModeMap } from "@/types";

type Options = {
  sessionId: string;
  initialModes: PersonaModeMap;
};

export function usePersonaMode({ sessionId, initialModes }: Options) {
  const [personaModes, setPersonaModes] = useState<PersonaModeMap>(initialModes);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Keeps a second admin tab (or another admin) in step.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`persona-mode:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "persona_mode",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const row = payload.new as PersonaMode;
          setPersonaModes((current) => ({
            ...current,
            [row.ai_persona_id]: row.mode,
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const toggleMode = useCallback(
    async (personaId: string) => {
      const next = personaModes[personaId] === "human" ? "ai" : "human";
      setPendingId(personaId);
      // Optimistic: the switch should feel instant mid-session.
      setPersonaModes((current) => ({ ...current, [personaId]: next }));

      const response = await fetch("/api/ai/toggle-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, personaId, newMode: next }),
      });

      if (!response.ok) {
        setPersonaModes((current) => ({
          ...current,
          [personaId]: next === "human" ? "ai" : "human",
        }));
      }

      setPendingId(null);
    },
    [personaModes, sessionId]
  );

  return { personaModes, toggleMode, pendingId };
}
