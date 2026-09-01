"use client";

import { MapPin, MessageSquare } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { colourForPersona } from "@/hooks/usePersonaComments";
import type { FakePersona } from "@/types";

export function PersonaCard({
  persona,
  personas,
  commentCount,
  onClick,
}: {
  persona: FakePersona;
  personas: FakePersona[];
  commentCount: number;
  onClick: () => void;
}) {
  const colour = colourForPersona(personas, persona.id);

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4 text-left transition-colors duration-200 hover:border-[#6C47FF]/40"
    >
      <span className="relative shrink-0">
        <Avatar name={persona.name} avatarUrl={persona.avatar_url} size={44} />
        {/* Matches this persona's pins on the comment timeline. */}
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#12121A]"
          style={{ background: colour }}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-white">
          {persona.name}
        </p>
        <p className="mt-0.5 flex items-center gap-3 text-[11.5px] text-[#A0A0B0]">
          {persona.location && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{persona.location}</span>
            </span>
          )}
          <span className="flex shrink-0 items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {commentCount}
          </span>
        </p>
      </div>
    </button>
  );
}
