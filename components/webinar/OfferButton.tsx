"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Users, X } from "lucide-react";

import { cn, formatOffset } from "@/lib/utils";
import type { WebinarOffer } from "@/types";

type Props = {
  offer: WebinarOffer;
  webinarId: string;
  registrantId: string | null;
  sessionId?: string | null;
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
  sessionId = null,
  currentTime,
  variant,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [proof, setProof] = useState<string | null>(null);
  const [bump, setBump] = useState<{
    id: string;
    title: string;
    description: string | null;
    price_cents: number;
    currency: string;
  } | null>(null);
  const [bumpChecked, setBumpChecked] = useState(false);
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

  /*
   * How many people have actually bought.
   *
   * True and computed from the ledger, and usually a better number than the
   * one a host would invent. Refreshed while the offer is up, because the
   * count moving is most of what makes it read as a live room; the server
   * returns nothing below a floor, so an early session shows no claim at all
   * rather than a weak one.
   */
  useEffect(() => {
    if (!revealed) return;

    let cancelled = false;
    const read = () =>
      fetch(
        `/api/webinar/${webinarId}/social-proof${
          sessionId ? `?sessionId=${sessionId}` : ""
        }`,
        { cache: "no-store" }
      )
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { message: string | null } | null) => {
          if (!cancelled) setProof(payload?.message ?? null);
        })
        .catch(() => undefined);

    void read();
    const id = setInterval(read, 45_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [revealed, webinarId, sessionId]);

  /*
   * The order bump, read once the offer is priced and revealed.
   *
   * Off by default and never pre-ticked. A checked-by-default add-on is a
   * dark pattern this product does not need to reach for, and the same
   * standard applies here as to the social-proof number above — real numbers,
   * honest defaults, nothing engineered to slip past someone.
   */
  useEffect(() => {
    if (!revealed || offer.price_cents <= 0) return;

    let cancelled = false;
    void fetch(`/api/webinar/${webinarId}/offer-bump`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { bump: typeof bump } | null) => {
        if (!cancelled) setBump(payload?.bump ?? null);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [revealed, webinarId, offer.price_cents]);

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
          body: JSON.stringify({
            registrantId,
            includeBump: bump ? bumpChecked : undefined,
          }),
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

  const money = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);

  const bumpRow = bump && (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#6C47FF]/30 bg-[#6C47FF]/[0.06] px-3.5 py-2.5 text-left">
      <input
        type="checkbox"
        checked={bumpChecked}
        onChange={(event) => setBumpChecked(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#6C47FF]"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[12.5px] font-medium text-white">
            Add {bump.title}
          </span>
          <span className="shrink-0 text-[12.5px] font-semibold text-[#6C47FF]">
            +{money(bump.price_cents, bump.currency)}
          </span>
        </span>
        {bump.description && (
          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[#A0A0B0]">
            {bump.description}
          </span>
        )}
      </span>
    </label>
  );

  const button = (
    <button
      onClick={open}
      data-offer-button
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
        <div className="animate-rise px-1 pt-3">
          {bumpRow && <div className="mb-2">{bumpRow}</div>}
          {button}
          {proof && (
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[11.5px] text-[#A0A0B0]">
              <Users className="h-3 w-3 shrink-0 text-[#22C55E]" />
              {proof}
            </p>
          )}
        </div>
      ) : (
        // Sits below the chat FAB, which lives at bottom-24.
        <div className="fixed inset-x-0 bottom-0 z-30 animate-rise lg:hidden">
          {bumpRow && (
            <div className="border-t border-[#1E1E2E] bg-[#0A0A0F] px-2 pb-1 pt-2">
              {bumpRow}
            </div>
          )}
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
