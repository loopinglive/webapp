"use client";

import { useState } from "react";
import { Pin } from "lucide-react";

import { EngagementRow } from "@/components/admin/engagement/EngagementPanel";
import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { TimestampInput } from "@/components/admin/ui/TimestampInput";
import { formatOffset } from "@/lib/utils";
import type { TimedPinnedMessage } from "@/types";

export function PinnedMessageBuilder({
  webinarId,
  duration,
  messages,
  onChanged,
}: {
  webinarId: string;
  duration: number;
  messages: TimedPinnedMessage[];
  onChanged: () => void;
}) {
  const [content, setContent] = useState("");
  const [offset, setOffset] = useState(0);
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!content.trim()) {
      setError("Write the message first.");
      return;
    }

    setError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "pinned",
        values: {
          content: content.trim(),
          video_offset_seconds: offset,
          duration_seconds: seconds,
        },
      }),
    });

    if (!response.ok) {
      setError("Could not save that message.");
      return;
    }

    setContent("");
    onChanged();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <Field label="Message" required>
          <TextArea
            rows={2}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="🔥 The offer James just mentioned is now live!"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pins at">
            <TimestampInput value={offset} onChange={setOffset} max={duration} />
          </Field>
          <Field label="Stays pinned for" hint="seconds">
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
          <div className="flex items-start gap-2 rounded-lg border border-[#6C47FF]/40 bg-[#6C47FF]/10 px-3 py-2.5">
            <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6C47FF]" />
            <p className="text-[12.5px] leading-relaxed text-white">
              {content || "Your pinned message appears here"}
            </p>
          </div>
        </div>

        {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}

        <AdminButton onClick={add}>Add pinned message</AdminButton>
      </section>

      {messages.length > 0 && (
        <ul className="space-y-2">
          {messages.map((message) => (
            <EngagementRow
              key={message.id}
              timestamp={formatOffset(message.video_offset_seconds)}
              onDelete={async () => {
                await fetch(
                  `/api/admin/webinar/${webinarId}/engagement?kind=pinned&id=${message.id}`,
                  { method: "DELETE" }
                );
                onChanged();
              }}
            >
              <p className="text-[13px] text-white">{message.content}</p>
            </EngagementRow>
          ))}
        </ul>
      )}
    </div>
  );
}
