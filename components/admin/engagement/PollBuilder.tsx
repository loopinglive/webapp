"use client";

import { useCallback, useEffect, useState } from "react";
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
              <PollStandings
                webinarId={webinarId}
                pollId={poll.id}
                options={poll.options as PollOption[]}
              />
            </EngagementRow>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * What the room actually answered, across every session.
 *
 * A poll you can write but never read the results of is a feature that only
 * half exists. Falls back to listing the options when nobody has voted, which
 * is what the row showed before there were any answers to show.
 */
function PollStandings({
  webinarId,
  pollId,
  options,
}: {
  webinarId: string;
  pollId: string;
  options: PollOption[];
}) {
  const [results, setResults] = useState<
    { option_id: string; votes: number; share: number }[] | null
  >(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/webinar/${webinarId}/poll-results?pollId=${pollId}`,
      { cache: "no-store" }
    );
    if (!response.ok) return;
    const payload = (await response.json()) as {
      results: { option_id: string; votes: number; share: number }[];
      total: number;
    };
    setResults(payload.results);
    setTotal(payload.total);
  }, [webinarId, pollId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const labels = new Map(options.map((option) => [option.id, option.label]));

  if (!results || total === 0) {
    return (
      <p className="mt-1 text-[11.5px] text-[#A0A0B0]">
        {options.map((option) => option.label).join(" · ")}
        {results ? " · no answers yet" : ""}
      </p>
    );
  }

  const byShare = [...results].sort((a, b) => b.share - a.share);

  return (
    <div className="mt-2 space-y-1.5">
      {byShare.map((row) => (
        <div key={row.option_id} className="flex items-center gap-2">
          <div className="relative h-5 flex-1 overflow-hidden rounded bg-[#12121A]">
            <div
              className="absolute inset-y-0 left-0 bg-[#6C47FF]/30"
              style={{ width: `${row.share}%` }}
            />
            <span className="relative flex h-full items-center px-2 text-[11.5px] text-white">
              {labels.get(row.option_id) ?? row.option_id}
            </span>
          </div>
          <span className="w-20 shrink-0 text-right text-[11.5px] tabular-nums text-[#A0A0B0]">
            {row.share}% · {row.votes}
          </span>
        </div>
      ))}
      <p className="text-[11px] text-[#6E6E80]">
        {total.toLocaleString()} {total === 1 ? "answer" : "answers"} across all
        sessions
      </p>
    </div>
  );
}
