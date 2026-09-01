"use client";

import { Bot, User } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { AiPersona } from "@/types";

export function PersonaToggle({
  persona,
  mode,
  onToggle,
  pending,
}: {
  persona: AiPersona;
  mode: "ai" | "human";
  onToggle: () => void;
  pending?: boolean;
}) {
  const isAi = mode === "ai";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A]/80 px-3.5 py-3">
      <Avatar name={persona.persona_name} avatarUrl={persona.avatar_url} size={32} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold text-white">
          {persona.persona_name}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: isAi ? "#00C851" : "#FF9500" }}
          />
          <span style={{ color: isAi ? "#00C851" : "#FF9500" }}>
            {isAi ? "AI mode" : "Human mode"}
          </span>
        </div>
      </div>

      <button
        onClick={onToggle}
        disabled={pending}
        aria-label={`Switch ${persona.persona_name} to ${isAi ? "human" : "AI"} mode`}
        title={
          isAi
            ? "Take over — you reply manually as this persona"
            : "Hand back to AI — automatic replies resume"
        }
        className={cn(
          "relative flex h-8 w-[68px] shrink-0 items-center rounded-full border transition-colors duration-200",
          isAi
            ? "border-[#00C851]/40 bg-[#00C851]/12"
            : "border-[#FF9500]/40 bg-[#FF9500]/12",
          pending && "opacity-60"
        )}
      >
        <span
          className={cn(
            "absolute grid h-6 w-6 place-items-center rounded-full text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isAi ? "left-1 bg-[#00C851]" : "left-[38px] bg-[#FF9500]"
          )}
        >
          {isAi ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
        </span>
      </button>
    </div>
  );
}
