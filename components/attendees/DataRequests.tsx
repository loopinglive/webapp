"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, ShieldAlert } from "lucide-react";

/**
 * Answering a subject access or erasure request.
 *
 * Both are rights with deadlines attached, and until now answering either one
 * meant someone opening a SQL console. Put on the attendee's own page because
 * that is where a host is standing when the email arrives.
 */
export function DataRequests({
  webinarId,
  registrantId,
  email,
}: {
  webinarId: string;
  registrantId: string;
  email: string;
}) {
  const router = useRouter();
  const [erasing, setErasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const base = `/api/admin/webinar/${webinarId}/attendees/${registrantId}/data`;

  async function erase() {
    setErasing(true);
    setError(null);

    const response = await fetch(base, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setErasing(false);
      setError(payload.error ?? "That did not work.");
      return;
    }

    // The page they are on no longer describes anything, so leave it.
    router.replace(`/admin/webinar/${webinarId}/attendees`);
  }

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <h2 className="text-[14px] font-semibold text-ink">Data requests</h2>
      <p className="mt-1 text-[11.5px] leading-relaxed text-ink-faint">
        If {email} asks for a copy of their data, or asks to be deleted.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={base}
          download
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-hairline px-3 text-[12.5px] text-ink-muted hover:text-ink"
        >
          <Download className="h-3.5 w-3.5" />
          Download their data
        </a>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-hairline px-3 text-[12.5px] text-ink-muted hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Erase them
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void erase()}
              disabled={erasing}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#FF5A5A] px-3 text-[12.5px] font-medium text-white hover:bg-[#E64A4A] disabled:opacity-60"
            >
              {erasing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Yes, erase permanently
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={erasing}
              className="h-9 rounded-lg px-3 text-[12.5px] text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <p className="mt-3 rounded-lg bg-[#FF5A5A]/10 px-3.5 py-3 text-[11.5px] leading-relaxed text-[#C4C4D0]">
          This cannot be undone. Their registration, chat, answers, events and
          watch history are deleted outright.
          <br />
          <span className="text-ink-faint">
            Two things are kept on purpose. Any purchase stays as a financial
            record with its link to them cut — the right to erasure does not
            override the obligation to keep sales records. And if they had
            unsubscribed, that is kept as a one-way hash of their address, so a
            future import cannot mail someone who asked not to be contacted.
          </span>
        </p>
      )}

      {error && <p className="mt-2 text-[12px] text-[#FF3B3B]">{error}</p>}
    </section>
  );
}
