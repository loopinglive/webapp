"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { EngagementRow } from "@/components/admin/engagement/EngagementPanel";
import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { TimestampInput } from "@/components/admin/ui/TimestampInput";
import { VideoUploader } from "@/components/admin/webinar/VideoUploader";
import { formatOffset } from "@/lib/utils";
import type { TimedHandout } from "@/types";

export function HandoutUploader({
  webinarId,
  duration,
  handouts,
  onChanged,
}: {
  webinarId: string;
  duration: number;
  handouts: TimedHandout[];
  onChanged: () => void;
}) {
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!title.trim() || !fileUrl) {
      setError("Upload a file and give it a title.");
      return;
    }

    setError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "handout",
        values: {
          title: title.trim(),
          file_url: fileUrl,
          video_offset_seconds: offset,
        },
      }),
    });

    if (!response.ok) {
      setError("Could not save that handout.");
      return;
    }

    setTitle("");
    setFileUrl("");
    onChanged();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <Field label="Title" required>
          <TextInput
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="The Offer Blueprint (PDF)"
          />
        </Field>

        <VideoUploader
          kind="pdf"
          target="handout"
          existingLabel={fileUrl ? title || "File ready" : null}
          onComplete={(result) => setFileUrl(result.url ?? "")}
        />

        <Field label="Drops at">
          <TimestampInput value={offset} onChange={setOffset} max={duration} />
        </Field>

        {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}

        <AdminButton onClick={add}>Add handout</AdminButton>
      </section>

      {handouts.length > 0 && (
        <ul className="space-y-2">
          {handouts.map((handout) => (
            <EngagementRow
              key={handout.id}
              timestamp={formatOffset(handout.video_offset_seconds)}
              onDelete={async () => {
                await fetch(
                  `/api/admin/webinar/${webinarId}/engagement?kind=handout&id=${handout.id}`,
                  { method: "DELETE" }
                );
                onChanged();
              }}
            >
              <p className="flex items-center gap-2 text-[13px] text-white">
                <Download className="h-3.5 w-3.5 text-[#6C47FF]" />
                {handout.title}
              </p>
            </EngagementRow>
          ))}
        </ul>
      )}
    </div>
  );
}
