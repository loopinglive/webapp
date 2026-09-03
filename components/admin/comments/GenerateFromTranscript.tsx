"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles, X } from "lucide-react";

import type { ClaimFlag } from "@/lib/claim-check";
import { colourForPersona } from "@/hooks/usePersonaComments";
import { formatOffset } from "@/lib/utils";
import type { FakePersona } from "@/types";

type Proposal = {
  personaId: string;
  offsetSeconds: number;
  content: string;
  flags: ClaimFlag[];
};

/**
 * Proposing timed comments from the video's own transcript, for review.
 *
 * Writing thirty of these by hand is the dullest part of setup and the one
 * most likely to be skipped, which is what leaves a chat feeling empty rather
 * than lived in. Nothing generated here reaches the video until the host
 * accepts it, one at a time or as a batch — this is a first draft, not an
 * autopilot.
 */
export function GenerateFromTranscript({
  webinarId,
  personas,
  onAccept,
}: {
  webinarId: string;
  personas: FakePersona[];
  onAccept: (input: {
    personaId: string;
    content: string;
    offsetSeconds: number;
  }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [accepting, setAccepting] = useState<Set<number>>(new Set());
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  async function generate() {
    setLoading(true);
    setError(null);
    setProposals(null);
    setAccepted(new Set());
    setDismissed(new Set());

    const response = await fetch(
      `/api/admin/webinar/${webinarId}/comments/generate`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
    const payload = (await response.json()) as {
      proposals?: Proposal[];
      error?: string;
    };
    setLoading(false);

    if (!response.ok || !payload.proposals) {
      setError(payload.error ?? "Could not generate anything.");
      return;
    }
    setProposals(payload.proposals);
  }

  async function accept(index: number) {
    const proposal = proposals?.[index];
    if (!proposal) return;

    setAccepting((current) => new Set(current).add(index));
    const result = await onAccept({
      personaId: proposal.personaId,
      content: proposal.content,
      offsetSeconds: proposal.offsetSeconds,
    });
    setAccepting((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });

    if (result) setAccepted((current) => new Set(current).add(index));
  }

  async function acceptAllClean() {
    if (!proposals) return;
    for (let index = 0; index < proposals.length; index += 1) {
      if (
        accepted.has(index) ||
        dismissed.has(index) ||
        proposals[index].flags.length > 0
      ) {
        continue;
      }
      // Sequential rather than parallel: the API dedupes on (persona,
      // timestamp), and firing every insert at once invites a race the
      // constraint would otherwise never see.
      await accept(index);
    }
  }

  const personaName = (id: string) =>
    personas.find((persona) => persona.id === id)?.name ?? "Unknown";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2A3A] px-3 py-1.5 text-[12px] text-[#A0A0B0] transition-colors hover:text-white"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Generate from transcript
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Generate timed comments"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#1E1E2E] bg-[#12121A]">
        <header className="flex items-center justify-between border-b border-[#1E1E2E] px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              Generate from transcript
            </h2>
            <p className="mt-0.5 text-[12px] text-[#6E6E80]">
              Read from your video&rsquo;s auto-transcript. Nothing is added until
              you accept it.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#A0A0B0] hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!proposals && !loading && !error && (
            <div className="py-10 text-center">
              <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-[#A0A0B0]">
                Reads the transcript and drafts a scattering of persona
                reactions at moments it actually gives one — not evenly spaced,
                because a real audience doesn&rsquo;t react evenly.
              </p>
              <button
                onClick={() => void generate()}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#6C47FF] px-4 text-[13px] font-medium text-white hover:bg-[#5B39E0]"
              >
                <Sparkles className="h-4 w-4" />
                Generate 15 proposals
              </button>
            </div>
          )}

          {loading && (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
              <p className="mt-3 text-[12.5px] text-[#6E6E80]">
                Reading the transcript…
              </p>
            </div>
          )}

          {error && (
            <div className="py-10 text-center">
              <p className="text-[13px] text-[#FF5A5A]">{error}</p>
              <button
                onClick={() => void generate()}
                className="mt-3 text-[12.5px] text-[#A0A0B0] hover:text-white"
              >
                Try again
              </button>
            </div>
          )}

          {proposals && (
            <ul className="space-y-2">
              {proposals.map((proposal, index) => {
                const isAccepted = accepted.has(index);
                const isDismissed = dismissed.has(index);
                const isAccepting = accepting.has(index);

                return (
                  <li
                    key={`${proposal.personaId}-${proposal.offsetSeconds}-${index}`}
                    className={`rounded-xl border px-3.5 py-3 transition-opacity ${
                      isDismissed
                        ? "border-[#1E1E2E] opacity-40"
                        : proposal.flags.length > 0
                          ? "border-[#F5A623]/30 bg-[#F5A623]/[0.05]"
                          : "border-[#1E1E2E]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[11px] text-[#6E6E80]">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: colourForPersona(personas, proposal.personaId) }}
                          />
                          {personaName(proposal.personaId)} ·{" "}
                          {formatOffset(proposal.offsetSeconds)}
                        </p>
                        <p className="mt-1 text-[13px] text-white">
                          {proposal.content}
                        </p>
                        {proposal.flags.length > 0 && (
                          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#F5A623]">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            {proposal.flags[0].note}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {isAccepted ? (
                          <span className="flex items-center gap-1 text-[11.5px] text-[#22C55E]">
                            <Check className="h-3.5 w-3.5" />
                            Added
                          </span>
                        ) : isDismissed ? (
                          <span className="text-[11.5px] text-[#6E6E80]">Skipped</span>
                        ) : (
                          <>
                            <button
                              onClick={() => void accept(index)}
                              disabled={isAccepting}
                              className="inline-flex h-7 items-center gap-1 rounded-md bg-[#6C47FF] px-2.5 text-[11.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-60"
                            >
                              {isAccepting && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                              Add
                            </button>
                            <button
                              onClick={() =>
                                setDismissed((current) => new Set(current).add(index))
                              }
                              className="h-7 rounded-md px-2 text-[11.5px] text-[#6E6E80] hover:text-white"
                            >
                              Skip
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {proposals && (
          <footer className="flex items-center justify-between border-t border-[#1E1E2E] px-5 py-3.5">
            <p className="text-[11.5px] text-[#6E6E80]">
              {accepted.size} added ·{" "}
              {proposals.filter((p) => p.flags.length > 0).length} flagged
            </p>
            <button
              onClick={() => void acceptAllClean()}
              className="text-[12px] text-[#00D4FF] hover:underline"
            >
              Add everything unflagged
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
