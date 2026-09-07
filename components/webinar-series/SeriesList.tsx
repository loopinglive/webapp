"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Loader2, Plus } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { useToast } from "@/components/ui/ToastProvider";

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  itemCount: number;
};

export function SeriesList() {
  const toast = useToast();
  const [series, setSeries] = useState<SeriesRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/series", { cache: "no-store" });
    const payload = await response.json();
    setSeries(payload.series ?? []);
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    const response = await fetch("/api/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, sequential_unlock: true }),
    });
    const payload = await response.json();
    setBusy(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not create series.");
      return;
    }

    setTitle("");
    setCreating(false);
    toast.success("Series created.");
    await load();
  }

  if (!series) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">Multi-part series</h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#6C47FF] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-[#7C57FF]"
        >
          <Plus className="h-3.5 w-3.5" />
          New series
        </button>
      </div>

      {creating && (
        <div className="mb-5 flex gap-2 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. 5-Day Trading Bootcamp"
            className="flex-1 rounded-lg border border-[#1E1E2E] bg-[#1A1A24] px-3 py-2 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="rounded-lg bg-[#6C47FF] px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}

      {series.length === 0 ? (
        <EmptyState
          title="No series yet"
          body="Chain webinars together — attendees unlock the next one after finishing the last."
          action={
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-lg bg-[#6C47FF] px-4 py-2 text-[13px] font-semibold text-white"
            >
              Create a series
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((row) => (
            <Link
              key={row.id}
              href={`/webinars/series/${row.id}`}
              className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4 transition hover:border-[#6C47FF]/40"
            >
              <div className="mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#6C47FF]" />
                <span className="text-[13.5px] font-medium text-white">{row.title}</span>
              </div>
              <p className="text-[12px] text-[#6E6E80]">
                {row.itemCount} webinar{row.itemCount === 1 ? "" : "s"} ·{" "}
                {row.is_active ? "Active" : "Paused"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
