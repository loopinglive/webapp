"use client";

import { Avatar } from "@/components/ui/Avatar";
import { colourForPersona } from "@/hooks/usePersonaComments";
import { cn } from "@/lib/utils";
import type { FakePersona } from "@/types";

/** Persona filter for the timeline — click a face to see only their pins. */
export function CommentSidebar({
  personas,
  counts,
  activeId,
  onSelect,
}: {
  personas: FakePersona[];
  counts: Map<string, number>;
  activeId: string | null;
  onSelect: (personaId: string | null) => void;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
        Personas
      </h3>

      <div className="mt-3 space-y-1">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-[12.5px] transition-colors",
            activeId === null
              ? "bg-[#6C47FF]/15 text-white"
              : "text-[#A0A0B0] hover:bg-white/5 hover:text-white"
          )}
        >
          All personas
          <span className="tabular-nums">
            {[...counts.values()].reduce((sum, count) => sum + count, 0)}
          </span>
        </button>

        {personas.map((persona) => {
          const active = activeId === persona.id;
          return (
            <button
              key={persona.id}
              onClick={() => onSelect(active ? null : persona.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors",
                active
                  ? "bg-[#6C47FF]/15 text-white"
                  : "text-[#A0A0B0] hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="relative shrink-0">
                <Avatar
                  name={persona.name}
                  avatarUrl={persona.avatar_url}
                  size={26}
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0A0A0F]"
                  style={{ background: colourForPersona(personas, persona.id) }}
                />
              </span>
              <span className="min-w-0 flex-1 truncate">{persona.name}</span>
              <span className="shrink-0 tabular-nums">
                {counts.get(persona.id) ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
