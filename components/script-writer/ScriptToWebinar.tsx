"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

/** Links a finished script to one of the writer's own webinars. */
export function ScriptToWebinar({ scriptId }: { scriptId: string }) {
  const toast = useToast();
  const [webinars, setWebinars] = useState<{ id: string; title: string }[] | null>(null);
  const [selected, setSelected] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

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
    const response = await fetch("/api/script-writer/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scriptId, webinarId: selected }),
    });
    setApplying(false);

    if (!response.ok) {
      toast.error("Could not link this script.");
      return;
    }
    setApplied(true);
    toast.success("Linked.");
  }

  if (applied) {
    return (
      <p className="flex items-center gap-1.5 text-[11.5px] text-[#22C55E]">
        <Check className="h-3.5 w-3.5" />
        Linked to your webinar
      </p>
    );
  }

  if (!webinars || webinars.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <select
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="h-8 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2 text-[11.5px] text-white focus:outline-none"
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
        className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#1E1E2E] text-[11.5px] text-white hover:bg-[#2A2A3A] disabled:opacity-60"
      >
        {applying && <Loader2 className="h-3 w-3 animate-spin" />}
        Link to this webinar
      </button>
    </div>
  );
}
