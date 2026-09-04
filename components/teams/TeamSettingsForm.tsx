"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/components/ui/ToastProvider";

export function TeamSettingsForm({ teamId }: { teamId: string }) {
  const { team, loading, refresh } = useTeam(teamId);
  const toast = useToast();
  const [name, setName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading || !team) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  const value = name ?? team.name;

  async function save() {
    if (!value.trim() || value === team!.name) return;
    setSaving(true);
    const response = await fetch(`/api/teams/${teamId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim() }),
    });
    setSaving(false);

    if (!response.ok) {
      toast.error("Could not save that.");
      return;
    }
    toast.success("Saved.");
    await refresh();
  }

  return (
    <div className="max-w-lg space-y-5 px-6 py-6 lg:px-10">
      <section className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <label className="block">
          <span className="text-[12px] text-[#A0A0B0]">Team name</span>
          <input
            value={value}
            onChange={(event) => setName(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13.5px] text-white focus:border-[#6C47FF] focus:outline-none"
          />
        </label>
        <p className="mt-2 text-[11.5px] text-[#6E6E80]">
          loopinglive.com/team/{team.slug}
        </p>

        <button
          onClick={() => void save()}
          disabled={saving || !value.trim() || value === team.name}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#6C47FF] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Save
        </button>
      </section>
    </div>
  );
}
