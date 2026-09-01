"use client";

import {
  applyCompliance,
  EXAMPLE_VARIABLES,
  resolveTemplate,
  smsSegments,
  WHATSAPP_LIMIT,
} from "@/lib/messaging/templates";
import type { MessageChannel } from "@/types/database";

/** How the message will actually land, with example data filled in. */
export function ChannelPreview({
  channel,
  subject,
  body,
  fromName,
  fromEmail,
}: {
  channel: MessageChannel;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
}) {
  const resolved = applyCompliance(
    channel,
    resolveTemplate(body, EXAMPLE_VARIABLES),
    EXAMPLE_VARIABLES.unsubscribe_link
  );
  const resolvedSubject = resolveTemplate(subject, EXAMPLE_VARIABLES);

  if (channel === "email") {
    return (
      <div>
        <Label>Preview</Label>
        <div className="overflow-hidden rounded-xl border border-[#2A2A3A] bg-white">
          <div className="border-b border-[#e6e6ec] px-4 py-3">
            <p className="text-[12px] text-[#6a6a7a]">
              {fromName} &lt;{fromEmail}&gt;
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-[#1a1a24]">
              {resolvedSubject || "(no subject)"}
            </p>
          </div>
          <div className="whitespace-pre-wrap px-4 py-4 text-[13px] leading-relaxed text-[#1a1a24]">
            {resolved}
          </div>
        </div>
      </div>
    );
  }

  if (channel === "sms") {
    const { characters, segments, unicode } = smsSegments(resolved);
    return (
      <div>
        <Label>Preview</Label>
        <div className="rounded-[28px] border border-[#2A2A3A] bg-[#0A0A0F] p-4">
          <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#1a1a24]">
              {resolved}
            </p>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-[#A0A0B0]">
          {characters} characters — {segments} SMS segment
          {segments === 1 ? "" : "s"}
          {unicode && " (unicode: 70 chars per segment)"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Label>Preview</Label>
      <div className="rounded-[28px] border border-[#2A2A3A] bg-[#0b141a] p-4">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#005c4b] px-3.5 py-2.5">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white">
            {resolved}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-[#A0A0B0]">
        {resolved.length} / {WHATSAPP_LIMIT} characters
      </p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
      {children}
    </p>
  );
}
