"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

import type { SectionProps } from "@/components/registration-builder/BuilderSidebar";
import { AdminButton, TextInput } from "@/components/admin/ui/Field";

const MAX_BULLETS = 8;

export function WhatYouWillLearnSection({ config, update }: SectionProps) {
  const bullets = (
    Array.isArray(config.what_you_will_learn) ? config.what_you_will_learn : []
  ) as string[];

  const set = (next: string[]) => update({ what_you_will_learn: next });

  // Reordering is arrow buttons rather than drag: it works with a keyboard,
  // on touch, and in the 380px sidebar where a drag target would be cramped.
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= bullets.length) return;
    const next = [...bullets];
    [next[index], next[target]] = [next[target], next[index]];
    set(next);
  };

  return (
    <>
      <p className="text-[11.5px] leading-relaxed text-[#A0A0B0]">
        Shown as a checklist. Up to {MAX_BULLETS}.
      </p>

      <div className="space-y-2">
        {bullets.map((bullet, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <button
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
                className="text-[#A0A0B0] transition-colors hover:text-white disabled:opacity-25"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === bullets.length - 1}
                aria-label="Move down"
                className="text-[#A0A0B0] transition-colors hover:text-white disabled:opacity-25"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <TextInput
              value={bullet}
              onChange={(event) => {
                const next = [...bullets];
                next[index] = event.target.value;
                set(next);
              }}
              placeholder="The exact structure that converts"
            />

            <button
              onClick={() => set(bullets.filter((_, i) => i !== index))}
              aria-label="Remove"
              className="shrink-0 text-[#A0A0B0] transition-colors hover:text-[#FF3B3B]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {bullets.length < MAX_BULLETS && (
        <AdminButton variant="secondary" onClick={() => set([...bullets, ""])}>
          <Plus className="h-3.5 w-3.5" />
          Add bullet point
        </AdminButton>
      )}
    </>
  );
}
