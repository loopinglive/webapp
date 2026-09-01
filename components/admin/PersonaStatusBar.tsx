"use client";

import { PersonaToggle } from "@/components/admin/PersonaToggle";
import type { AiPersona, PersonaModeMap } from "@/types";

export function PersonaStatusBar({
  personas,
  personaModes,
  onToggle,
  pendingId,
}: {
  personas: AiPersona[];
  personaModes: PersonaModeMap;
  onToggle: (personaId: string) => void;
  pendingId: string | null;
}) {
  if (!personas.length) {
    return (
      <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A]/80 px-4 py-6 text-center text-[12.5px] text-[#A0A0B0]">
        No AI personas configured for this webinar yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A0A0B0]">
        Personas
      </h2>
      {personas.map((persona) => (
        <PersonaToggle
          key={persona.id}
          persona={persona}
          mode={personaModes[persona.id] ?? "ai"}
          onToggle={() => onToggle(persona.id)}
          pending={pendingId === persona.id}
        />
      ))}
    </div>
  );
}
