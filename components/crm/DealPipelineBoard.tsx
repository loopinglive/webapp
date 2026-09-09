"use client";

import { useState } from "react";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";

import { useDealPipeline, type Deal } from "@/hooks/useDealPipeline";

function money(value: number) {
  return value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value.toFixed(0)}`;
}

/**
 * A deal board for webinar leads. Deals open themselves when someone clicks
 * the offer, so the common case is a host arriving to a board that already
 * has cards on it rather than an empty one asking to be filled in.
 *
 * Drag and drop is the browser's own (draggable + dataTransfer) — a Kanban
 * does not justify pulling in a drag library, and the keyboard path is
 * covered by the per-card stage buttons.
 */
export function DealPipelineBoard() {
  const { pipeline, deals, loading, moveDeal, markDeal, createDeal, removeDeal } = useDealPipeline();
  const [dragging, setDragging] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!pipeline) {
    return <p className="px-6 py-16 text-center text-[13px] text-ink-muted">No pipeline yet.</p>;
  }

  const open = deals.filter((deal) => !deal.won && !deal.lost);
  const won = deals.filter((deal) => deal.won);
  const openValue = open.reduce((sum, deal) => sum + deal.value, 0);
  const wonValue = won.reduce((sum, deal) => sum + deal.value, 0);

  async function submitNewDeal() {
    if (!title.trim() || !pipeline) return;
    await createDeal({ title: title.trim(), value: Number(value) || 0, stage: pipeline.stages[0]?.key ?? "new" });
    setTitle("");
    setValue("");
    setAdding(false);
  }

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">{pipeline.name}</h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {open.length} open worth {money(openValue)} · {won.length} won worth {money(wonValue)}
          </p>
        </div>
        <button
          onClick={() => setAdding((current) => !current)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline px-4 text-[13px] text-ink-muted transition-colors hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" />
          New deal
        </button>
      </div>

      {adding && (
        <div className="mt-5 flex flex-wrap items-end gap-2.5 rounded-xl border border-hairline bg-surface p-4">
          <label className="min-w-[220px] flex-1">
            <span className="text-[12px] text-ink-muted">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Jane Doe — coaching programme"
              className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="w-32">
            <span className="text-[12px] text-ink-muted">Value</span>
            <input
              value={value}
              onChange={(event) => setValue(event.target.value.replace(/[^\d.]/g, ""))}
              placeholder="997"
              inputMode="decimal"
              className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <button
            onClick={() => void submitNewDeal()}
            disabled={!title.trim()}
            className="h-10 rounded-full bg-accent px-5 text-[13px] font-semibold text-white hover:bg-accent-soft disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}

      <div className="mt-6 flex gap-3 overflow-x-auto pb-4">
        {pipeline.stages.map((stage) => {
          const cards = open.filter((deal) => deal.stage === stage.key);
          const stageValue = cards.reduce((sum, deal) => sum + deal.value, 0);

          return (
            <div
              key={stage.key}
              onDragOver={(event) => {
                event.preventDefault();
                setOverStage(stage.key);
              }}
              onDragLeave={() => setOverStage((current) => (current === stage.key ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                setOverStage(null);
                const dealId = event.dataTransfer.getData("text/plain") || dragging;
                if (dealId) void moveDeal(dealId, stage.key, stage.probability);
                setDragging(null);
              }}
              className={`w-[260px] shrink-0 rounded-xl border p-3 transition-colors ${
                overStage === stage.key ? "border-accent bg-accent/5" : "border-hairline bg-surface/60"
              }`}
            >
              <div className="flex items-baseline justify-between px-1">
                <span className="text-[12.5px] font-medium text-ink">{stage.label}</span>
                <span className="text-[11px] tabular-nums text-ink-faint">
                  {cards.length} · {money(stageValue)}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {cards.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    stages={pipeline.stages}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", deal.id);
                      setDragging(deal.id);
                    }}
                    onMove={(nextStage) => {
                      const target = pipeline.stages.find((row) => row.key === nextStage);
                      void moveDeal(deal.id, nextStage, target?.probability ?? deal.probability);
                    }}
                    onWon={() => void markDeal(deal.id, "won")}
                    onLost={() => void markDeal(deal.id, "lost")}
                    onDelete={() => void removeDeal(deal.id)}
                  />
                ))}
                {cards.length === 0 && <p className="px-1 py-4 text-center text-[11.5px] text-ink-faint">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>

      {(won.length > 0 || deals.some((deal) => deal.lost)) && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <ClosedList title="Won" deals={won} tone="text-[#00C851]" />
          <ClosedList title="Lost" deals={deals.filter((deal) => deal.lost)} tone="text-ink-faint" />
        </div>
      )}
    </div>
  );
}

function DealCard({
  deal,
  stages,
  onDragStart,
  onMove,
  onWon,
  onLost,
  onDelete,
}: {
  deal: Deal;
  stages: { key: string; label: string }[];
  onDragStart: (event: React.DragEvent) => void;
  onMove: (stage: string) => void;
  onWon: () => void;
  onLost: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded-lg border border-hairline bg-surface px-3 py-2.5 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] leading-snug text-ink">{deal.title}</span>
        <span className="shrink-0 text-[12px] tabular-nums text-ink-muted">{money(deal.value)}</span>
      </div>

      {deal.registrants?.email && <p className="mt-1 truncate text-[11px] text-ink-faint">{deal.registrants.email}</p>}

      <div className="mt-2.5 flex items-center gap-1">
        <select
          value={deal.stage}
          onChange={(event) => onMove(event.target.value)}
          aria-label="Move to stage"
          className="h-7 flex-1 rounded border border-hairline bg-surface-2 px-1.5 text-[11px] text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          {stages.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.label}
            </option>
          ))}
        </select>
        <button onClick={onWon} title="Mark won" className="grid h-7 w-7 place-items-center rounded text-ink-faint hover:bg-[#00C851]/10 hover:text-[#00C851]">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={onLost} title="Mark lost" className="grid h-7 w-7 place-items-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink">
          <X className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} title="Delete" className="grid h-7 w-7 place-items-center rounded text-ink-faint hover:bg-[#FF6B6B]/10 hover:text-[#FF6B6B]">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function ClosedList({ title, deals, tone }: { title: string; deals: Deal[]; tone: string }) {
  if (deals.length === 0) return null;
  return (
    <div className="rounded-xl border border-hairline bg-surface/60 p-3">
      <span className={`px-1 text-[12.5px] font-medium ${tone}`}>
        {title} ({deals.length})
      </span>
      <div className="mt-2 space-y-1.5">
        {deals.slice(0, 8).map((deal) => (
          <div key={deal.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
            <span className="truncate text-[12px] text-ink-muted">{deal.title}</span>
            <span className="shrink-0 text-[11.5px] tabular-nums text-ink-faint">{money(deal.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
