"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";

const REASONS = [
  { id: "misleading_claims", label: "Misleading or false claims" },
  { id: "scam_or_fraud", label: "Looks like a scam" },
  { id: "not_live", label: "Presented as live but is not" },
  { id: "impersonation", label: "Pretending to be someone else" },
  { id: "offensive", label: "Offensive or harmful content" },
  { id: "other", label: "Something else" },
] as const;

/**
 * The way to say something is wrong with this webinar.
 *
 * Deliberately quiet — a prominent report button in a sales room would be
 * used as a heckle. It is in the chat header, findable by anyone looking for
 * it and invisible to anyone who is not.
 *
 * Open to people who never registered: the person best placed to report a
 * scam is often the one who saw enough to leave, and requiring registration
 * would make them the one person who cannot.
 */
export function ReportButton({
  webinarId,
  sessionId,
  registrantId,
}: {
  webinarId: string;
  sessionId: string | null;
  registrantId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function send() {
    if (!reason) return;
    setSending(true);

    const response = await fetch(`/api/webinar/${webinarId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason,
        detail: detail.trim() || undefined,
        sessionId: sessionId ?? undefined,
        registrantId: registrantId ?? undefined,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    setSending(false);

    // A rate-limited repeat is told the same thing as a first report. Someone
    // reporting twice does not need to be argued with.
    setDone(
      response.ok || response.status === 429
        ? "Thank you — this has been sent to Loopinglive for review."
        : (payload.error ?? "That did not send. Please try again.")
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Report this webinar"
        title="Report this webinar"
        className="rounded-full p-1.5 text-[#A0A0B0]/50 transition-colors hover:bg-white/5 hover:text-[#A0A0B0]"
      >
        <Flag className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Report this webinar"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
        {done ? (
          <>
            <p className="text-[13.5px] leading-relaxed text-white">{done}</p>
            <button
              onClick={() => {
                setOpen(false);
                setDone(null);
              }}
              className="mt-4 h-9 w-full rounded-lg bg-[#1E1E2E] text-[13px] text-white hover:bg-[#2A2A3A]"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="text-[15px] font-semibold text-white">
              Report this webinar
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[#A0A0B0]">
              This goes to Loopinglive, not to the host. They are not told who
              reported them.
            </p>

            <div className="mt-3.5 space-y-1.5">
              {REASONS.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-[#C4C4D0] hover:bg-white/5"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={option.id}
                    checked={reason === option.id}
                    onChange={() => setReason(option.id)}
                    className="h-3.5 w-3.5 accent-[#6C47FF]"
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What happened? Optional, but it helps."
              aria-label="What happened"
              className="mt-3 w-full rounded-xl border border-[#1E1E2E] bg-[#0A0A0F] px-3 py-2.5 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
            />

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void send()}
                disabled={!reason || sending}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[#6C47FF] text-[13px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-50"
              >
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Send report
              </button>
              <button
                onClick={() => setOpen(false)}
                className="h-9 rounded-lg px-3 text-[13px] text-[#A0A0B0] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
