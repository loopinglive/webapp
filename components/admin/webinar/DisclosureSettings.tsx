"use client";

import { Info } from "lucide-react";

import { useSetupContext } from "@/components/admin/webinar/WebinarSetupShell";

/**
 * How this session is described to the people watching it.
 *
 * The format itself is a legal question nobody has answered — consumer
 * protection regulators in the US, UK and EU take a dim view of material
 * misrepresentation in a sales context, and whether "live" on a scheduled
 * replay counts is a question for a lawyer.
 *
 * What this does is make the answer a host's to give. Some sell into regulated
 * niches and need a softer label; "encore presentation" is how the industry
 * has handled this for years. Offering it costs nothing and the alternative —
 * one hard-coded word for every customer in every market — is a decision made
 * on their behalf that they cannot see or change.
 */
const LABELS = [
  {
    id: "live",
    name: "Live",
    blurb: "The default. A red LIVE badge, as now.",
  },
  {
    id: "encore",
    name: "Encore",
    blurb: "An encore presentation. The industry's usual framing for a rerun.",
  },
  {
    id: "replay",
    name: "Replay",
    blurb: "Plainly a recording. The safest wording in a regulated niche.",
  },
  {
    id: "workshop",
    name: "Workshop",
    blurb: "Neutral: says what it is without claiming when it was made.",
  },
] as const;

export function DisclosureSettings() {
  const { webinar, updateWebinar } = useSetupContext();
  if (!webinar) return null;

  const current = webinar.broadcast_label || "live";

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
          How this is described
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#6E6E80]">
          The badge attendees see, and whether the page says the session was
          recorded.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {LABELS.map((label) => {
          const active = current === label.id;
          return (
            <button
              key={label.id}
              onClick={() => updateWebinar({ broadcastLabel: label.id })}
              className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                active
                  ? "border-[#6C47FF] bg-[#6C47FF]/10"
                  : "border-[#1E1E2E] hover:border-[#6C47FF]/40"
              }`}
            >
              <span
                className={`text-[13px] font-medium ${
                  active ? "text-white" : "text-[#C4C4D0]"
                }`}
              >
                {label.name}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[#6E6E80]">
                {label.blurb}
              </span>
            </button>
          );
        })}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#1E1E2E] px-3.5 py-3">
        <input
          type="checkbox"
          defaultChecked={webinar.show_recorded_notice}
          onChange={(event) =>
            updateWebinar({ showRecordedNotice: event.target.checked })
          }
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#6C47FF]"
        />
        <span>
          <span className="block text-[13px] text-white">
            Say on the page that this was recorded
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[#6E6E80]">
            A line under the video reading &ldquo;This presentation was recorded
            in advance.&rdquo; Some markets and some niches expect it.
          </span>
        </span>
      </label>

      <p className="flex gap-2 rounded-xl bg-[#12121A] px-3.5 py-3 text-[11.5px] leading-relaxed text-[#6E6E80]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A0A0B0]" />
        <span>
          We cannot tell you what your jurisdiction requires, and this setting is
          not legal advice. If you sell into a regulated market, it is worth an
          hour of a lawyer&rsquo;s time — the question is much cheaper to answer
          now than after a complaint.
        </span>
      </p>
    </section>
  );
}
