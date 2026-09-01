"use client";

import { useState } from "react";

import { EngagementRow } from "@/components/admin/engagement/EngagementPanel";
import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { ColourPicker } from "@/components/admin/ui/ColourPicker";
import { TimestampInput } from "@/components/admin/ui/TimestampInput";
import { formatOffset } from "@/lib/utils";
import type { TimedCta } from "@/types";

export function CTABuilder({
  webinarId,
  duration,
  ctas,
  onChanged,
}: {
  webinarId: string;
  duration: number;
  ctas: TimedCta[];
  onChanged: () => void;
}) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [colour, setColour] = useState("#6C47FF");
  const [offset, setOffset] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!text.trim() || !url.trim()) {
      setError("Button text and a URL are required.");
      return;
    }

    setError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "cta",
        values: {
          button_text: text.trim(),
          button_url: url.trim(),
          button_colour: colour,
          video_offset_seconds: offset,
          duration_seconds: seconds,
        },
      }),
    });

    if (!response.ok) {
      setError("Could not save that CTA.");
      return;
    }

    setText("");
    setUrl("");
    onChanged();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <Field label="Button text" required>
          <TextInput
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Download the checklist"
          />
        </Field>

        <Field label="Button URL" required>
          <TextInput
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
          />
        </Field>

        <div>
          <span className="text-[12px] font-medium text-[#A0A0B0]">Colour</span>
          <div className="mt-2">
            <ColourPicker value={colour} onChange={setColour} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Drops at">
            <TimestampInput value={offset} onChange={setOffset} max={duration} />
          </Field>
          <Field label="Visible for" hint="seconds">
            <TextInput
              type="number"
              min={5}
              value={seconds}
              onChange={(event) => setSeconds(Number(event.target.value))}
            />
          </Field>
        </div>

        <div className="rounded-lg border border-[#2A2A3A] bg-[#0A0A0F] p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
            Preview
          </p>
          <span
            style={{ background: colour }}
            className="inline-flex h-10 items-center rounded-full px-5 text-[13.5px] font-semibold text-white"
          >
            {text || "Your button text"}
          </span>
        </div>

        {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}

        <AdminButton onClick={add}>Add CTA</AdminButton>
      </section>

      {ctas.length > 0 && (
        <ul className="space-y-2">
          {ctas.map((cta) => (
            <EngagementRow
              key={cta.id}
              timestamp={formatOffset(cta.video_offset_seconds)}
              onDelete={async () => {
                await fetch(
                  `/api/admin/webinar/${webinarId}/engagement?kind=cta&id=${cta.id}`,
                  { method: "DELETE" }
                );
                onChanged();
              }}
            >
              <p className="flex items-center gap-2 text-[13px] text-white">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: cta.button_colour }}
                />
                {cta.button_text}
              </p>
              <p className="mt-0.5 truncate text-[11.5px] text-[#A0A0B0]">
                {cta.button_url}
              </p>
            </EngagementRow>
          ))}
        </ul>
      )}
    </div>
  );
}
