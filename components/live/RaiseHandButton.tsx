"use client";

import { useState } from "react";
import { Hand } from "lucide-react";

import { cn } from "@/lib/utils";

/** A toggle button attendees use to raise/lower their hand during the live session. */
export function RaiseHandButton({
  sessionId,
  registrantId,
}: {
  sessionId: string | null;
  registrantId: string | null;
}) {
  const [raised, setRaised] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!sessionId || !registrantId) return null;

  async function toggle() {
    if (!sessionId || !registrantId) return;
    setBusy(true);
    const next = !raised;
    setRaised(next);
    await fetch(`/api/webinar/raise-hand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, registrantId, action: next ? "raise" : "lower" }),
    }).catch(() => {});
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-medium transition-colors",
        raised
          ? "border-[#6C47FF] bg-[#6C47FF]/20 text-white"
          : "border-white/10 bg-white/5 text-[#A0A0B0] hover:text-white"
      )}
    >
      <Hand className={cn("h-4 w-4", raised && "text-[#6C47FF]")} />
      {raised ? "Hand raised" : "Raise hand"}
    </button>
  );
}
