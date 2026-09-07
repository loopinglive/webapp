"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { useInteractiveElements } from "@/hooks/useInteractiveElements";
import { formatOffset, parseOffset } from "@/lib/utils";

type ElementType = "hotspot" | "social_share";

export function InteractiveElementEditor({ webinarId }: { webinarId: string }) {
  const { elements, addElement, removeElement } = useInteractiveElements(webinarId);
  const toast = useToast();

  const [type, setType] = useState<ElementType>("hotspot");
  const [offset, setOffset] = useState("00:00:00");
  const [duration, setDuration] = useState(30);
  const [label, setLabel] = useState("");
  const [link, setLink] = useState("");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSaving(true);

    const config =
      type === "hotspot"
        ? { x, y, label: label.trim(), link: link.trim() }
        : { message: message.trim() };

    const result = await addElement({
      elementType: type,
      videoOffsetSeconds: parseOffset(offset),
      durationSeconds: duration,
      config,
    });

    setSaving(false);
    if (!result.element) {
      setError(result.error ?? "Could not save that element.");
      return;
    }

    setLabel("");
    setLink("");
    setMessage("");
    toast.success("Interactive element added.");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex gap-2">
          {(["hotspot", "social_share"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setType(option)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                type === option ? "bg-accent text-white" : "border border-hairline text-ink-muted hover:text-ink"
              }`}
            >
              {option === "hotspot" ? "Video hotspot" : "Social share prompt"}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11.5px] text-ink-faint">Appears at</span>
            <input
              value={offset}
              onChange={(event) => setOffset(event.target.value)}
              placeholder="00:00:00"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-void px-3 text-center font-mono text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block">
            <span className="text-[11.5px] text-ink-faint">Duration (seconds)</span>
            <input
              type="number"
              min={1}
              max={120}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-void px-3 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>

        {type === "hotspot" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11.5px] text-ink-faint">Label</span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="View the product"
                className="mt-1 h-10 w-full rounded-lg border border-hairline bg-void px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </label>
            <label className="block">
              <span className="text-[11.5px] text-ink-faint">Link</span>
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://…"
                className="mt-1 h-10 w-full rounded-lg border border-hairline bg-void px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </label>
            <label className="block">
              <span className="text-[11.5px] text-ink-faint">Horizontal position — {x}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={x}
                onChange={(event) => setX(Number(event.target.value))}
                className="mt-2 w-full accent-accent"
              />
            </label>
            <label className="block">
              <span className="text-[11.5px] text-ink-faint">Vertical position — {y}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={y}
                onChange={(event) => setY(Number(event.target.value))}
                className="mt-2 w-full accent-accent"
              />
            </label>
          </div>
        ) : (
          <label className="mt-3 block">
            <span className="text-[11.5px] text-ink-faint">Message</span>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Love what you're hearing? Share this webinar!"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-void px-3 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        )}

        {error && <p className="mt-2 text-[12px] text-[#FF6B6B]">{error}</p>}

        <button
          onClick={submit}
          disabled={saving}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add element
        </button>
      </div>

      {!elements ? null : elements.length === 0 ? (
        <EmptyState
          icon="✨"
          title="No interactive elements yet"
          description="Hotspots and share prompts appear over the video at the timestamp you set."
        />
      ) : (
        <ul className="space-y-2">
          {elements.map((element) => (
            <li
              key={element.id}
              className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3"
            >
              <div>
                <p className="text-[13px] font-medium text-ink">
                  {element.element_type === "hotspot" ? "Hotspot" : "Social share"} —{" "}
                  {(element.config.label as string) || (element.config.message as string) || ""}
                </p>
                <p className="mt-0.5 font-mono text-[11.5px] text-ink-faint">
                  {formatOffset(element.video_offset_seconds)} for {element.duration_seconds}s
                </p>
              </div>
              <button
                onClick={() => removeElement(element.id)}
                aria-label="Delete element"
                className="grid h-8 w-8 place-items-center rounded-lg border border-hairline text-ink-faint transition-colors hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
