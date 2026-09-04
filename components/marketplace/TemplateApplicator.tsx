"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

export function TemplateApplicator({
  listingId,
  listingType,
}: {
  listingId: string;
  listingType: string;
}) {
  const toast = useToast();
  const [webinars, setWebinars] = useState<{ id: string; title: string }[] | null>(null);
  const [selected, setSelected] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/marketplace/my-webinars", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { webinars: { id: string; title: string }[] };
      setWebinars(payload.webinars);
      if (payload.webinars[0]) setSelected(payload.webinars[0].id);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function apply() {
    if (!selected) return;
    setApplying(true);
    const response = await fetch("/api/marketplace/apply-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, webinarId: selected }),
    });
    const payload = (await response.json()) as { applied?: string[]; error?: string };
    setApplying(false);

    if (!response.ok || !payload.applied) {
      toast.error(payload.error ?? "Could not apply this.");
      return;
    }
    setApplied(payload.applied);
    toast.success("Applied.");
  }

  if (applied) {
    return (
      <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#22C55E]/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-[#22C55E]">
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Added {applied.join(", ")}.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <p className="mb-2 text-[11.5px] text-[#22C55E]">You own this.</p>

      {webinars === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#6C47FF]" />
      ) : webinars.length === 0 ? (
        <p className="text-[12px] text-[#6E6E80]">
          Create a webinar first, then come back to apply this {listingType.replace(/_/g, " ")}.
        </p>
      ) : (
        <>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="h-9 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12.5px] text-white focus:outline-none"
          >
            {webinars.map((webinar) => (
              <option key={webinar.id} value={webinar.id}>
                {webinar.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => void apply()}
            disabled={applying}
            className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-[#1E1E2E] text-[12.5px] text-white hover:bg-[#2A2A3A] disabled:opacity-60"
          >
            {applying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Apply to this webinar
          </button>
        </>
      )}
    </div>
  );
}
