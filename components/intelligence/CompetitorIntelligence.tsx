"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";

import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCompetitorIntelligence, type Competitor } from "@/hooks/useCompetitorIntelligence";
import { cn } from "@/lib/utils";

const money = (cents: number) => `$${(cents / 100).toFixed(0)}`;

export function CompetitorIntelligence() {
  const { competitors, loading, adding, error, addCompetitor, addObservation, remove } = useCompetitorIntelligence();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  return (
    <>
      <PageHeader
        title="Competitor Intelligence"
        subtitle="A log you keep yourself — pricing and offer changes you observe over time, tracked so the trend is visible."
        action={
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[13px] font-semibold text-white shadow-[0_10px_30px_-10px_#6C47FF] hover:bg-[#7C5AFF]"
          >
            <Plus className="h-3.5 w-3.5" />
            Track a competitor
          </button>
        }
      />

      <div className="px-6 py-8 lg:px-10">
        {formOpen && (
          <div className="mb-6 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Competitor name" required>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Webinars" />
              </Field>
              <Field label="Website" hint="Optional">
                <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://acme.com" />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <AdminButton
                disabled={!name.trim() || adding}
                onClick={async () => {
                  const ok = await addCompetitor(name, url);
                  if (ok) {
                    setName("");
                    setUrl("");
                    setFormOpen(false);
                  }
                }}
              >
                {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </AdminButton>
            </div>
          </div>
        )}

        {error && <p className="mb-4 text-[12.5px] text-[#FF3B3B]">{error}</p>}

        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : !competitors || competitors.length === 0 ? (
          <EmptyState icon="🔍" title="Nothing tracked yet" description="Add a competitor to start logging what you notice about their pricing and offers." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {competitors.map((competitor) => (
              <CompetitorCard key={competitor.id} competitor={competitor} onAddObservation={addObservation} onRemove={remove} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function CompetitorCard({
  competitor,
  onAddObservation,
  onRemove,
}: {
  competitor: Competitor;
  onAddObservation: (id: string, input: { priceCents: number | null; offerHeadline: string; notes: string }) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [logging, setLogging] = useState(false);
  const [price, setPrice] = useState("");
  const [headline, setHeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const latest = competitor.data_points[competitor.data_points.length - 1];
  const { trend } = competitor;

  async function save() {
    setSaving(true);
    try {
      await onAddObservation(competitor.id, {
        priceCents: price.trim() ? Math.round(Number(price) * 100) : null,
        offerHeadline: headline,
        notes,
      });
      setPrice("");
      setHeadline("");
      setNotes("");
      setLogging(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[14px] font-semibold text-white">{competitor.competitor_name}</p>
          {competitor.competitor_url && (
            <a href={competitor.competitor_url} target="_blank" rel="noreferrer" className="text-[11.5px] text-[#6C47FF] hover:underline">
              {competitor.competitor_url}
            </a>
          )}
        </div>
        <button onClick={() => void onRemove(competitor.id)} className="rounded-full p-1.5 text-[#6A6A80] hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {latest ? (
        <div className="mt-3">
          {latest.priceCents !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold tabular-nums text-white">{money(latest.priceCents)}</span>
              {trend.changePercent !== null && trend.observationCount > 1 && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[11px] font-medium",
                    trend.direction === "up" ? "text-[#FF9500]" : trend.direction === "down" ? "text-[#00C851]" : "text-[#6A6A80]"
                  )}
                >
                  {trend.direction === "up" ? <TrendingUp className="h-3 w-3" /> : trend.direction === "down" ? <TrendingDown className="h-3 w-3" /> : null}
                  {trend.changePercent > 0 ? "+" : ""}
                  {trend.changePercent}%
                </span>
              )}
            </div>
          )}
          {latest.offerHeadline && <p className="mt-1 text-[12.5px] text-[#C8C8D4]">{latest.offerHeadline}</p>}
          {latest.notes && <p className="mt-1 text-[11.5px] text-[#6A6A80]">{latest.notes}</p>}
          <p className="mt-2 text-[10.5px] text-[#6A6A80]">
            {competitor.data_points.length} observation{competitor.data_points.length === 1 ? "" : "s"} · last {latest.date}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-[#6A6A80]">No observations logged yet.</p>
      )}

      {logging ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-[#1E1E2E] pt-3">
          <TextInput value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price ($)" type="number" className="h-9" />
          <TextInput value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Offer headline" className="h-9" />
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} />
          <div className="flex gap-2">
            <AdminButton className="h-8 px-3 text-[12px]" disabled={saving} onClick={() => void save()}>
              Save
            </AdminButton>
            <AdminButton variant="ghost" className="h-8 px-3 text-[12px]" onClick={() => setLogging(false)}>
              Cancel
            </AdminButton>
          </div>
        </div>
      ) : (
        <button onClick={() => setLogging(true)} className="mt-3 text-[12px] font-medium text-[#6C47FF] hover:text-[#7C5AFF]">
          + Log an observation
        </button>
      )}
    </div>
  );
}
