"use client";

import { PersonaAvatarUploader } from "@/components/admin/personas/PersonaAvatarUploader";
import { Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { cn } from "@/lib/utils";

const MAX_BRIEF = 300;

export type PersonaDraft = {
  id?: string;
  personaName: string;
  avatarUrl: string;
  personalityBrief: string;
  fakeCommentReplyPercentage: number;
  isActive: boolean;
};

export function AIPersonaForm({
  index,
  draft,
  onChange,
}: {
  index: number;
  draft: PersonaDraft;
  onChange: (draft: PersonaDraft) => void;
}) {
  const set = <K extends keyof PersonaDraft>(key: K, value: PersonaDraft[K]) =>
    onChange({ ...draft, [key]: value });

  const over = draft.personalityBrief.length > MAX_BRIEF;

  return (
    <section
      className={cn(
        "space-y-4 rounded-xl border bg-[#12121A] p-5 transition-colors",
        draft.isActive ? "border-[#1E1E2E]" : "border-[#1E1E2E] opacity-60"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
          Moderator {index + 1}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-[#A0A0B0]">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => set("isActive", event.target.checked)}
            className="h-3.5 w-3.5 accent-[#6C47FF]"
          />
          Active
        </label>
      </div>

      <PersonaAvatarUploader
        name={draft.personaName}
        value={draft.avatarUrl}
        onChange={(url) => set("avatarUrl", url)}
      />

      <Field label="Name viewers see" required>
        <TextInput
          value={draft.personaName}
          onChange={(event) => set("personaName", event.target.value)}
          placeholder="Sarah"
        />
      </Field>

      <Field
        label="Personality brief"
        required
        hint={`${draft.personalityBrief.length}/${MAX_BRIEF}`}
        error={over ? "Trim this to 300 characters." : null}
      >
        <TextArea
          rows={5}
          value={draft.personalityBrief}
          onChange={(event) => set("personalityBrief", event.target.value)}
          placeholder="Warm, encouraging, and supportive. Uses emojis occasionally. Always makes people feel welcome and excited about the content."
        />
      </Field>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] font-medium text-[#A0A0B0]">
            Replies to persona chatter
          </span>
          <span className="text-[12px] tabular-nums text-white">
            {draft.fakeCommentReplyPercentage}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={draft.fakeCommentReplyPercentage}
          onChange={(event) =>
            set("fakeCommentReplyPercentage", Number(event.target.value))
          }
          className="mt-2 w-full accent-[#6C47FF]"
        />
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#A0A0B0]">
          Real attendees always get a reply. This is how much of your scripted
          chatter they answer on top.
        </p>
      </div>
    </section>
  );
}
