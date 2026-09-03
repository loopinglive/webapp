"use client";

import { X } from "lucide-react";

import type { WebinarOffer } from "@/types";

/**
 * One prompt, on the way out.
 *
 * Deliberately not a guilt trip and not a second offer stacked on the first —
 * it restates what is on the table and gets out of the way. Anything more
 * aggressive costs more goodwill than the recovered click is worth.
 */
export function ExitPrompt({
  open,
  offer,
  onClose,
  onTakeOffer,
}: {
  open: boolean;
  offer: WebinarOffer | null;
  onClose: () => void;
  onTakeOffer: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-prompt-title"
      className="fixed inset-0 z-[130] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-[420px] rounded-2xl border border-[#23232F] bg-[#0D0D15] p-6 text-center">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-[#6E6E80] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <h2
          id="exit-prompt-title"
          className="text-[20px] font-semibold tracking-[-0.02em] text-white"
        >
          {offer ? "Before you go" : "Leaving already?"}
        </h2>

        <p className="mx-auto mt-2 max-w-[36ch] text-[13.5px] leading-relaxed text-[#A0A0B0]">
          {offer
            ? `${offer.offer_title} is available for the rest of this session. You can take it now and finish watching afterwards.`
            : "The replay link will be in your inbox shortly, so you can pick this up whenever suits you."}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {offer && (
            <button
              onClick={onTakeOffer}
              className="h-11 rounded-full bg-[#6C47FF] text-[14px] font-semibold text-white transition-colors hover:bg-[#7C5AFF]"
            >
              {offer.button_text}
            </button>
          )}
          <button
            onClick={onClose}
            className="h-10 text-[13px] text-[#6E6E80] transition-colors hover:text-white"
          >
            Keep watching
          </button>
        </div>
      </div>
    </div>
  );
}
