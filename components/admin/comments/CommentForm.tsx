"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { AdminButton, Field, TextArea } from "@/components/admin/ui/Field";
import { TimestampInput } from "@/components/admin/ui/TimestampInput";
import { Avatar } from "@/components/ui/Avatar";
import { colourForPersona } from "@/hooks/usePersonaComments";
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
