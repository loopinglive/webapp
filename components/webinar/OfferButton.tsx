"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";

import { cn, formatOffset } from "@/lib/utils";
import type { WebinarOffer } from "@/types";

type Props = {
  offer: WebinarOffer;
  webinarId: string;
  registrantId: string | null;
  /** Playhead in seconds. */
  currentTime: number;
  variant: "desktop" | "mobile";
};

const ANIMATIONS: Record<WebinarOffer["button_animation"], string> = {
  pulse: "animate-pulse-ring",
  glow: "animate-offer-glow",
  slide: "",
  bounce: "animate-offer-bounce",
};

/**
 * The offer, revealed on the video's own clock.
 *
 * It appears the second the host reveals it and then stays for the rest of the
 * session — it never comes back down, because a viewer who arrives after the
 * moment should still be able to buy.
 */
export function OfferButton({
  offer,
  webinarId,
  registrantId,
  currentTime,
  variant,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [remaining, setRemaining] = useState(
    offer.countdown_enabled ? offer.countdown_minutes * 60 : null
  );

  // currentTime is monotonic, so crossing the offset is a one-way door.
  const revealed = currentTime >= offer.trigger_video_offset_seconds;

  // Countdown runs from the reveal, not from the session start.
  useEffect(() => {
    if (!revealed || !offer.countdown_enabled) return;

    const endsAt = Date.now() + offer.countdown_minutes * 60 * 1000;
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    }, 1000);

    return () => clearInterval(id);
  }, [revealed, offer.countdown_enabled, offer.countdown_minutes]);

  if (!revealed) return null;

  const href =
    offer.offer_type === "external"
      ? offer.external_url
      : `/offer/${offer.webinar_id}`;

  async function open() {
    if (registrantId) {
      void fetch(`/api/webinar/${webinarId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrantId }),
        keepalive: true,
      }).catch(() => {});
    }

    // A priced offer checks out in place. Sending someone to another site is
    // where the decision they just made goes to die.
    if (offer.price_cents > 0 && registrantId) {
      setBuying(true);
      try {
        const response = await fetch(`/api/webinar/${webinarId}/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrantId }),
        });

        if (response.ok) {
          const { url } = (await response.json()) as { url?: string };
          if (url) {
            // A new tab, not a redirect: the webinar keeps playing behind them
            // and they come back to their place rather than to the start.
            window.open(url, "_blank", "noopener,noreferrer");
            setBuying(false);
            return;
          }
        }
        // Anything else -- no price, payments unconfigured -- falls through to
        // the host's own link rather than dead-ending.
      } catch {
        /* fall through */
      }
      setBuying(false);
    }

    if (!href) return;

    if (offer.opens_in === "modal") {
      setModalOpen(true);
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  }

  const button = (
    <button
      onClick={open}
      style={{ background: offer.button_colour }}
      className={cn(
        "group flex w-full items-center justify-center gap-2.5 font-semibold text-white",
        "shadow-[0_14px_44px_-10px_rgba(108,71,255,0.9)] transition-transform duration-200",
        "hover:brightness-110 active:scale-[0.99]",
        ANIMATIONS[offer.button_animation],
        variant === "desktop"
          ? "h-13 rounded-full px-6 text-[15px]"
          : "h-14 rounded-none px-5 text-[15px]"
      )}
    >
      <span className="truncate">
        {buying ? "Opening checkout…" : offer.button_text}
      </span>
      {remaining !== null && (
        <span className="shrink-0 rounded-full bg-black/20 px-2 py-0.5 text-[12px] tabular-nums">
          {formatOffset(remaining).replace(/^00:/, "")}
        </span>
      )}
      <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  );

  return (
    <>
      {variant === "desktop" ? (
        <div className="animate-rise px-1 pt-3" style={{ height: 64 }}>
          {button}
        </div>
      ) : (
        // Sits below the chat FAB, which lives at bottom-24.
        <div className="fixed inset-x-0 bottom-0 z-30 animate-rise lg:hidden">
          {button}
        </div>
      )}

      {modalOpen && href && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative h-[80dvh] w-full max-w-4xl overflow-hidden rounded-xl border border-[#1E1E2E] bg-[#12121A]">
            <button
              onClick={() => setModalOpen(false)}
              aria-label="Close offer"
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
            <iframe
              src={href}
              title={offer.offer_title}
              className="h-full w-full border-0"
            />
          </div>
        </div>
      )}
    </>
  );
}
