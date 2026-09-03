"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { AdminButton, Field, TextArea } from "@/components/admin/ui/Field";
import { TimestampInput } from "@/components/admin/ui/TimestampInput";
import { Avatar } from "@/components/ui/Avatar";
import { colourForPersona } from "@/hooks/usePersonaComments";
import { checkClaims } from "@/lib/claim-check";
import { cn } from "@/lib/utils";
import type { FakePersona, TimedComment } from "@/types";

type Props = {
  personas: FakePersona[];
  duration: number;
  /** Editing an existing pin, or null when adding a new one. */
  comment: TimedComment | null;
  draftOffset: number;
  error: string | null;
  onSave: (input: {
    personaId: string;
    content: string;
    offsetSeconds: number;
  }) => Promise<boolean>;
  onDelete?: () => void;
  onCancel: () => void;
};

export function CommentForm({
  personas,
  duration,
  comment,
  draftOffset,
  error,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const [personaId, setPersonaId] = useState(
    comment?.persona_id ?? personas[0]?.id ?? ""
  );
  const [content, setContent] = useState(comment?.content ?? "");
  const [offset, setOffset] = useState(
    comment?.video_offset_seconds ?? draftOffset
  );
  const [saving, setSaving] = useState(false);

  /*
   * Claims worth a second look before this goes in a real person's chat.
   *
   * Computed during render rather than debounced into state: it is a handful
   * of regexes over one short line, and a warning that arrives half a second
   * after the words does not feel like it belongs to them.
   */
  const flags = checkClaims(content);

  // Selecting a different pin re-seeds the form — the parent remounts this
  // component with a new key rather than syncing props into state here.

  // Dragging the selected pin moves its timestamp under the open form.
  const [lastOffset, setLastOffset] = useState(comment?.video_offset_seconds);
  if (comment && comment.video_offset_seconds !== lastOffset) {
    setLastOffset(comment.video_offset_seconds);
    setOffset(comment.video_offset_seconds);
  }

  async function save() {
    if (!personaId || !content.trim()) return;
    setSaving(true);
    const ok = await onSave({ personaId, content, offsetSeconds: offset });
    setSaving(false);
    if (ok && !comment) setContent("");
  }

  if (!personas.length) {
    return (
      <p className="rounded-xl border border-dashed border-[#3A3A4A] px-4 py-10 text-center text-[12.5px] text-[#A0A0B0]">
        Create a persona first — someone has to say it.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
        {comment ? "Edit comment" : "New comment"}
      </h3>

      <Field label="Timestamp">
        <TimestampInput value={offset} onChange={setOffset} max={duration} />
      </Field>

      <div>
        <span className="text-[12px] font-medium text-[#A0A0B0]">Who says it</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {personas.map((persona) => {
            const active = persona.id === personaId;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => setPersonaId(persona.id)}
                style={active ? { borderColor: colourForPersona(personas, persona.id) } : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2 py-1 pr-3 text-[12px] transition-colors duration-200",
                  active
                    ? "bg-white/5 text-white"
                    : "border-[#2A2A3A] text-[#A0A0B0] hover:text-white"
                )}
              >
                <Avatar
                  name={persona.name}
                  avatarUrl={persona.avatar_url}
                  size={20}
                />
                {persona.name}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Comment">
        <TextArea
          rows={3}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What do they type into the chat?"
        />
      </Field>

      {/*
        A warning, never a block. A host writing "the last cohort averaged 3x"
        may have the receipts, and refusing to let them say so would be
        software being wrong about their business. What this can do is make
        sure nobody schedules one of these without noticing what they wrote.
      */}
      {flags.length > 0 && (
        <div className="rounded-xl border border-[#F5A623]/30 bg-[#F5A623]/[0.06] px-3.5 py-3">
          <p className="flex items-center gap-2 text-[12px] font-medium text-[#F5A623]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Worth a second look
          </p>
          <ul className="mt-1.5 space-y-1">
            {flags.map((flag) => (
              <li key={flag.kind} className="text-[11.5px] leading-relaxed text-[#C4C4D0]">
                <span className="text-[#F5A623]">&ldquo;{flag.matched}&rdquo;</span>{" "}
                — {flag.note}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-[#6E6E80]">
            This persona is a character you wrote, so anything it says is
            something you are saying. You can post it anyway.
          </p>
        </div>
      )}

      {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <AdminButton onClick={save} disabled={saving || !content.trim()}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {comment ? "Save changes" : "Add comment"}
        </AdminButton>
        <AdminButton variant="ghost" onClick={onCancel}>
          {comment ? "Done" : "Clear"}
        </AdminButton>
        {comment && onDelete && (
          <AdminButton variant="danger" onClick={onDelete} className="ml-auto">
            <Trash2 className="h-3.5 w-3.5" />
          </AdminButton>
        )}
      </div>
    </div>
  );
}
