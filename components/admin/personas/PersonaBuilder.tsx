"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Trash2, Upload, UserPlus, X } from "lucide-react";

import { PersonaCard } from "@/components/admin/personas/PersonaCard";
import { PersonaCommentHistory } from "@/components/admin/personas/PersonaCommentHistory";
import { PersonaForm } from "@/components/admin/personas/PersonaForm";
import { AdminButton } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { Avatar } from "@/components/ui/Avatar";
import type { FakePersona } from "@/types";

export function PersonaBuilder({ webinarId }: { webinarId: string }) {
  const [personas, setPersonas] = useState<FakePersona[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<FakePersona | null>(null);
  const [editing, setEditing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/personas`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        personas: FakePersona[];
        commentCounts: Record<string, number>;
      };
      setPersonas(payload.personas);
      setCommentCounts(payload.commentCounts);
      setSelected((current) =>
        current
          ? (payload.personas.find((p) => p.id === current.id) ?? null)
          : null
      );
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function importCsv(file: File) {
    setImportError(null);
    const text = await file.text();
    const [header, ...rows] = text.trim().split(/\r?\n/);
    const columns = header.split(",").map((column) => column.trim().toLowerCase());

    const bulk = rows
      .map((row) => {
        const cells = row.split(",");
        const pick = (name: string) => {
          const index = columns.indexOf(name);
          return index >= 0 ? cells[index]?.trim() : undefined;
        };
        return {
          name: pick("name"),
          location: pick("location"),
          avatar_url: pick("avatar_url"),
        };
      })
      .filter((row) => row.name);

    if (!bulk.length) {
      setImportError("No rows with a name column were found.");
      return;
    }

    const response = await fetch(`/api/admin/webinar/${webinarId}/personas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setImportError(payload.error ?? "Could not import that file.");
      return;
    }

    await load();
  }

  async function deletePersona(personaId: string) {
    await fetch(
      `/api/admin/webinar/${webinarId}/personas?personaId=${personaId}`,
      { method: "DELETE" }
    );
    setSelected(null);
    await load();
  }

  return (
    <>
      <SectionHeader
        title="Fake personas"
        description="The cast that fills your chat. Each one gets their own comment script."
        action={
          <div className="flex items-center gap-2">
            <AdminButton variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </AdminButton>
            <AdminButton onClick={() => setCreating(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              New persona
            </AdminButton>
          </div>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importCsv(file);
          event.target.value = "";
        }}
      />

      <div className="px-6 py-8 lg:px-8">
        {importError && (
          <p className="mb-4 rounded-lg bg-[#FF3B3B]/10 px-3.5 py-2.5 text-[12.5px] text-[#FF3B3B]">
            {importError}
          </p>
        )}

        {creating && (
          <div className="mb-6 max-w-md rounded-xl border border-[#6C47FF]/30 bg-[#12121A] p-5">
            <PersonaForm
              webinarId={webinarId}
              onSaved={() => {
                setCreating(false);
                void load();
              }}
              onCancel={() => setCreating(false)}
            />
          </div>
        )}

        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : personas.length === 0 && !creating ? (
          <p className="rounded-xl border border-dashed border-[#3A3A4A] px-6 py-14 text-center text-[13.5px] text-[#A0A0B0]">
            No personas yet. They are the voices that make the room feel full.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {personas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                personas={personas}
                commentCount={commentCounts[persona.id] ?? 0}
                onClick={() => {
                  setSelected(persona);
                  setEditing(false);
                }}
              />
            ))}
          </div>
        )}

        {personas.length > 0 && (
          <button
            onClick={async () => {
              await fetch(
                `/api/admin/webinar/${webinarId}/personas?all=true`,
                { method: "DELETE" }
              );
              await load();
            }}
            className="mt-8 text-[12px] text-[#A0A0B0] transition-colors hover:text-[#FF3B3B]"
          >
            Delete all personas
          </button>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <>
          <button
            aria-label="Close panel"
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          />
          <aside className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[460px] animate-rise flex-col border-l border-[#1E1E2E] bg-[#0D0D17]">
            <header className="flex items-start gap-3 border-b border-[#1E1E2E] px-5 py-4">
              <Avatar
                name={selected.name}
                avatarUrl={selected.avatar_url}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-semibold text-white">
                  {selected.name}
                </h2>
                {selected.location && (
                  <p className="text-[12px] text-[#A0A0B0]">{selected.location}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {editing ? (
                <PersonaForm
                  webinarId={webinarId}
                  persona={selected}
                  onSaved={() => {
                    setEditing(false);
                    void load();
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <PersonaCommentHistory
                  webinarId={webinarId}
                  persona={selected}
                  onChanged={load}
                />
              )}
            </div>

            {!editing && (
              <footer className="flex items-center gap-2 border-t border-[#1E1E2E] px-5 py-4">
                <AdminButton variant="secondary" onClick={() => setEditing(true)}>
                  Edit persona
                </AdminButton>
                <AdminButton
                  variant="danger"
                  onClick={() => deletePersona(selected.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </AdminButton>
              </footer>
            )}
          </aside>
        </>
      )}
    </>
  );
}
