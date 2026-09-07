"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { cn } from "@/lib/utils";

type Webinar = { id: string; title: string };

type Sequence = {
  id: string;
  source_webinar_id: string;
  target_webinar_id: string;
  delay_days: number;
  is_active: boolean;
  email_subject: string | null;
  email_body: string | null;
  source: { title: string } | { title: string }[] | null;
  target: { title: string } | { title: string }[] | null;
};

function titleOf(value: Sequence["source"]) {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.title ?? "Untitled webinar";
}

export function UpsellSequences() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [delayDays, setDelayDays] = useState(30);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [seqRes, webinarRes] = await Promise.all([
      fetch("/api/upsell-sequences", { cache: "no-store" }),
      fetch("/api/admin/webinars", { cache: "no-store" }),
    ]);
    if (seqRes.ok) setSequences((await seqRes.json()).sequences ?? []);
    if (webinarRes.ok) {
      const payload = await webinarRes.json();
      setWebinars(Array.isArray(payload.webinars) ? payload.webinars : (payload ?? []));
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  async function create() {
    setError(null);
    if (!sourceId || !targetId) {
      setError("Pick both webinars.");
      return;
    }
    const response = await fetch("/api/upsell-sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceWebinarId: sourceId,
        targetWebinarId: targetId,
        delayDays,
        emailSubject: subject || undefined,
        emailBody: body || undefined,
      }),
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Could not create that sequence.");
      return;
    }
    setCreating(false);
    setSourceId("");
    setTargetId("");
    setSubject("");
    setBody("");
    await load();
  }

  async function toggle(id: string, isActive: boolean) {
    await fetch("/api/upsell-sequences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/upsell-sequences?id=${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8 lg:px-10">
      <div className="flex justify-end">
        <AdminButton onClick={() => setCreating((v) => !v)}>
          <Plus className="h-3.5 w-3.5" /> New sequence
        </AdminButton>
      </div>

      {creating && (
        <div className="max-w-xl space-y-4 rounded-xl border border-[#6C47FF]/30 bg-[#12121A] p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="After finishing">
              <select
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
                className="h-11 w-full rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3 text-[13.5px] text-white"
              >
                <option value="">Select webinar…</option>
                {webinars.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Offer this webinar">
              <select
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="h-11 w-full rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3 text-[13.5px] text-white"
              >
                <option value="">Select webinar…</option>
                {webinars.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Wait how many days after they finish" hint="0 = immediately">
            <TextInput
              type="number"
              min={0}
              value={delayDays}
              onChange={(event) => setDelayDays(Number(event.target.value) || 0)}
            />
          </Field>
          <Field label="Email subject" hint="Optional — a sensible default is used otherwise">
            <TextInput value={subject} onChange={(event) => setSubject(event.target.value)} />
          </Field>
          <Field label="Email body" hint="Optional">
            <TextArea rows={4} value={body} onChange={(event) => setBody(event.target.value)} />
          </Field>
          {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setCreating(false)} className="text-[12.5px] text-[#A0A0B0] hover:text-white">
              Cancel
            </button>
            <AdminButton onClick={create}>Create</AdminButton>
          </div>
        </div>
      )}

      {sequences.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#3A3A4A] px-6 py-14 text-center text-[13.5px] text-[#A0A0B0]">
          No upsell sequences yet. Set one up to automatically pitch a related webinar once someone finishes another.
        </p>
      ) : (
        <div className="space-y-2">
          {sequences.map((sequence) => (
            <div
              key={sequence.id}
              className={cn(
                "flex items-center justify-between rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-3",
                !sequence.is_active && "opacity-60"
              )}
            >
              <div>
                <p className="text-[13px] text-white">
                  {titleOf(sequence.source)} <span className="text-[#A0A0B0]">→</span> {titleOf(sequence.target)}
                </p>
                <p className="text-[11.5px] text-[#A0A0B0]">{sequence.delay_days} days after completion</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(sequence.id, !sequence.is_active)}
                  className="text-[11.5px] font-medium text-[#6C47FF] hover:text-[#7C5AFF]"
                >
                  {sequence.is_active ? "Pause" : "Activate"}
                </button>
                <button onClick={() => remove(sequence.id)} className="text-[#A0A0B0] hover:text-[#FF3B3B]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
