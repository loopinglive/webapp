"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { PersonaAvatarUploader } from "@/components/admin/personas/PersonaAvatarUploader";
import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import type { FakePersona } from "@/types";

export function PersonaForm({
  webinarId,
  persona,
  onSaved,
  onCancel,
}: {
  webinarId: string;
  persona?: FakePersona;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(persona?.name ?? "");
  const [location, setLocation] = useState(persona?.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(persona?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/personas`, {
      method: persona ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaId: persona?.id,
        name,
        location,
        avatarUrl,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not save that persona.");
      return;
    }

    onSaved();
  }

  return (
    <div className="space-y-4">
      <PersonaAvatarUploader
        name={name}
        value={avatarUrl ?? ""}
        onChange={setAvatarUrl}
      />

      <Field label="Full name" required>
        <TextInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Amara Okafor"
        />
      </Field>

      <Field label="Location" hint="Optional">
        <TextInput
          value={location ?? ""}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Lagos, Nigeria"
        />
      </Field>

      {error && <p className="text-[12.5px] text-[#FF3B3B]">{error}</p>}

      <div className="flex items-center gap-2">
        <AdminButton onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {persona ? "Save changes" : "Create persona"}
        </AdminButton>
        <AdminButton variant="ghost" onClick={onCancel}>
          Cancel
        </AdminButton>
      </div>
    </div>
  );
}
