"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { AdminButton } from "@/components/admin/ui/Field";
import { cn } from "@/lib/utils";

/**
 * The only segment an admin sets by hand.
 *
 * Offers sold on an external page give us no signal, so someone has to say so —
 * behind a confirmation, because it moves the attendee out of every follow-up
 * sequence.
 */
export function ManualBoughtToggle({
  registrantId,
  name,
  bought,
  onChanged,
  compact = false,
}: {
  registrantId: string;
  name: string;
  bought: boolean;
  onChanged: (bought: boolean) => void;
  compact?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    const response = await fetch(
      `/api/admin/attendees/${registrantId}/${bought ? "mark-unbought" : "mark-bought"}`,
      { method: "POST" }
    );
    setBusy(false);
    setConfirming(false);
    if (response.ok) onChanged(!bought);
  }

  return (
    <>
      <button
        onClick={(event) => {
          event.stopPropagation();
          setConfirming(true);
        }}
        title={bought ? "Unmark purchase" : "Mark as purchased"}
        aria-label={bought ? "Unmark purchase" : "Mark as purchased"}
        className={cn(
          "relative shrink-0 rounded-full transition-colors duration-200",
          compact ? "h-5 w-9" : "h-6 w-11",
          bought ? "bg-[#00C851]" : "bg-[#3A3A4A]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 rounded-full bg-white transition-all duration-200",
            compact ? "h-4 w-4" : "h-5 w-5",
            bought
              ? compact
                ? "left-[18px]"
                : "left-[22px]"
              : "left-0.5"
          )}
        />
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-xl border border-[#1E1E2E] bg-[#12121A] p-6">
            <h2 className="text-[16px] font-semibold text-white">
              {bought ? "Unmark this purchase?" : "Mark as purchased?"}
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[#A0A0B0]">
              {bought ? (
                <>
                  <span className="text-white">{name}</span> moves back to the
                  segment their behaviour earned, and re-enters follow-up.
                </>
              ) : (
                <>
                  <span className="text-white">{name}</span> moves to the Bought
                  segment and stops receiving follow-up for this offer.
                </>
              )}
            </p>

            <div className="mt-6 flex items-center gap-2">
              <AdminButton onClick={apply} disabled={busy}>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {bought ? "Unmark" : "Mark as bought"}
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
