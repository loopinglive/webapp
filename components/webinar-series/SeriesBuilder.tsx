"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, Loader2, Plus, Trash2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

type Item = {
  id: string;
  webinar_id: string;
  position: number;
  unlock_delay_hours: number;
  webinars: { title: string; is_active: boolean } | null;
};

type Series = {
  id: string;
  title: string;
  description: string | null;
  sequential_unlock: boolean;
  is_active: boolean;
};

type Candidate = { id: string; title: string };

export function SeriesBuilder({ seriesId }: { seriesId: string }) {
  const toast = useToast();
  const [series, setSeries] = useState<Series | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [seriesRes, webinarsRes] = await Promise.all([
      fetch(`/api/series/${seriesId}`, { cache: "no-store" }),
      fetch("/api/admin/webinars", { cache: "no-store" }),
    ]);
    const seriesPayload = await seriesRes.json();
    const webinarsPayload = await webinarsRes.json();
    setSeries(seriesPayload.series);
    setItems(seriesPayload.items ?? []);
    setCandidates((webinarsPayload.webinars ?? []).map((w: { id: string; title: string }) => ({ id: w.id, title: w.title })));
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  async function addItem() {
    if (!selected) return;
    setBusy(true);
    const response = await fetch(`/api/series/${seriesId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId: selected }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      toast.error(payload.error ?? "Could not add webinar.");
      return;
    }
    setSelected("");
    setAdding(false);
    await load();
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/series/${seriesId}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    await load();
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);

    await fetch(`/api/series/${seriesId}/items`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedItemIds: next.map((item) => item.id) }),
    });
  }

  async function toggleSequential(value: boolean) {
    setSeries((prev) => (prev ? { ...prev, sequential_unlock: value } : prev));
    await fetch(`/api/series/${seriesId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequential_unlock: value }),
    });
  }

  if (!series) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  const usedIds = new Set(items.map((item) => item.webinar_id));
  const available = candidates.filter((candidate) => !usedIds.has(candidate.id));

  return (
    <div className="px-6 py-8 lg:px-10">
      <Link href="/webinars/series" className="mb-6 flex items-center gap-1.5 text-[13px] text-[#A0A0B0] hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" />
        All series
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-white">{series.title}</h2>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#6C47FF] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#7C57FF]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add webinar
            </button>
          </div>

          {adding && (
            <div className="mb-4 flex gap-2">
              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                className="flex-1 rounded-lg border border-[#1E1E2E] bg-[#1A1A24] px-3 py-2 text-[13px] text-white focus:border-[#6C47FF] focus:outline-none"
              >
                <option value="">Select a webinar…</option>
                {available.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addItem}
                disabled={busy || !selected}
                className="rounded-lg bg-[#6C47FF] px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#6E6E80]">
              Add webinars in the order attendees should watch them.
            </p>
          ) : (
            <ol className="space-y-2">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-[#1E1E2E] bg-[#1A1A24] px-3.5 py-3"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#6C47FF]/20 text-[11px] font-semibold text-[#6C47FF]">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-[13px] text-white">{item.webinars?.title}</span>
                  <button type="button" onClick={() => move(index, -1)} className="text-[#6E6E80] hover:text-white">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} className="text-[#6E6E80] hover:text-white">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeItem(item.id)} className="text-[#FF5A5A] hover:text-[#FF7A7A]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-white">Sequential unlock</p>
                <p className="text-[12px] text-[#6E6E80]">Each part unlocks only after the last is watched.</p>
              </div>
              <input
                type="checkbox"
                checked={series.sequential_unlock}
                onChange={(event) => toggleSequential(event.target.checked)}
                className="h-5 w-9 shrink-0 accent-[#6C47FF]"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
            <p className="mb-2 text-[12.5px] font-medium text-[#D0D0DC]">Share link</p>
            <code className="block truncate rounded-lg bg-black/30 px-3 py-2 text-[11.5px] text-[#00D4FF]">
              /series/{seriesId}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
