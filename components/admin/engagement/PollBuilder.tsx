"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { EngagementRow } from "@/components/admin/engagement/EngagementPanel";
import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { TimestampInput } from "@/components/admin/ui/TimestampInput";
import { formatOffset } from "@/lib/utils";
import type { PollOption, TimedPoll } from "@/types";

const MAX_OPTIONS = 4;

export function PollBuilder({
  webinarId,
  duration,
  polls,
  onChanged,
}: {
  webinarId: string;
  duration: number;
  polls: TimedPoll[];
  onChanged: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [offset, setOffset] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const cleaned = options.map((option) => option.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) {
      setError("A question and at least two options are required.");
      return;
    }

    setError(null);

    const payload: PollOption[] = cleaned.map((label, index) => ({
      id: String(index + 1),
      label,
    }));

    const response = await fetch(`/api/admin/webinar/${webinarId}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "poll",
        values: {
          question: question.trim(),
          options: payload,
          video_offset_seconds: offset,
          duration_seconds: seconds,
        },
      }),
    });

    if (!response.ok) {
      setError("Could not save that poll.");
      return;
    }

    setQuestion("");
    setOptions(["", ""]);
    onChanged();
  }

  async function remove(id: string) {
    await fetch(
      `/api/admin/webinar/${webinarId}/engagement?kind=poll&id=${id}`,
      { method: "DELETE" }
    );
    onChanged();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <Field label="Question" required>
          <TextInput
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which of these sounds most like you?"
          />
        </Field>

        <div className="space-y-2">
          <span className="text-[12px] font-medium text-[#A0A0B0]">Options</span>
          {options.map((option, index) => (
            <TextInput
              key={index}
              value={option}
              onChange={(event) => {
                const next = [...options];
                next[index] = event.target.value;
                setOptions(next);
              }}
              placeholder={`Option ${index + 1}`}
            />
          ))}
          {options.length < MAX_OPTIONS && (
            <AdminButton
              variant="ghost"
              onClick={() => setOptions([...options, ""])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add option
            </AdminButton>
          )}
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

        {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}

        <AdminButton onClick={add}>Add poll</AdminButton>
      </section>

      {polls.length > 0 && (
        <ul className="space-y-2">
          {polls.map((poll) => (
            <EngagementRow
              key={poll.id}
              timestamp={formatOffset(poll.video_offset_seconds)}
              onDelete={() => remove(poll.id)}
            >
              <p className="text-[13px] text-white">{poll.question}</p>
              <p className="mt-1 text-[11.5px] text-[#A0A0B0]">
                {(poll.options as PollOption[])
                  .map((option) => option.label)
                  .join(" · ")}
              </p>
            </EngagementRow>
          ))}
        </ul>
      )}
    </div>
  );
}
