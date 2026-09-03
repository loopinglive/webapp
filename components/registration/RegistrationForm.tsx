"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { CountrySelector } from "@/components/registration/CountrySelector";
import { useIsHydrated } from "@/hooks/useIsHydrated";
import { DEFAULT_COUNTRY, type Country } from "@/lib/countries";
import { saveRegistrant } from "@/lib/registrant-storage";
import { trackLead } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import type { CustomField, StoredRegistrant } from "@/types";

const field = cn(
  "h-[52px] w-full rounded-lg border border-white/10 bg-black/25 px-4 text-sm text-white",
  "placeholder:text-white/40 transition-colors duration-200",
  "hover:border-white/20",
  "focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25"
);

/** Captured at load, sent at submit. Never updated afterwards. */
function readSource() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
    referrer: document.referrer || undefined,
    landingPage: window.location.href,
  };
}

export function RegistrationForm({
  webinarId,
  customFields = [],
  ctaText = "Reserve My Spot →",
  buttonColour = "#6C47FF",
  pixelId,
  trackLeadEvent,
  gaId,
  trackConversion,
}: {
  webinarId: string;
  customFields?: CustomField[];
  ctaText?: string;
  buttonColour?: string;
  pixelId?: string | null;
  trackLeadEvent?: boolean;
  gaId?: string | null;
  trackConversion?: boolean;
}) {
  const router = useRouter();
  const hydrated = useIsHydrated();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /*
   * When this form reached the screen.
   *
   * A bot fills and submits in well under a second; a person has to read the
   * fields and tick a consent box. The server treats an implausibly fast
   * submission as automated.
   *
   * Stamped in an effect rather than in the render body — reading the clock
   * during render is impure, and the value would be unstable across renders,
   * which is exactly what a ref is here to prevent. Null until mounted, and
   * the server treats a missing elapsed time as unknown rather than as fast.
   */
  const renderedAt = useRef<number | null>(null);

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(event.currentTarget);

    const custom: Record<string, unknown> = {};
    for (const item of customFields) {
      custom[item.label || item.id] =
        item.type === "checkbox"
          ? data.get(`custom_${item.id}`) === "on"
          : (data.get(`custom_${item.id}`) ?? null);
    }

    const response = await fetch(`/api/webinar/${webinarId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: data.get("fullName"),
        email: data.get("email"),
        phone: data.get("phone"),
        countryCode: data.get("countryCode"),
        gdprConsent: data.get("gdprConsent") === "on",
        customFields: custom,
        source: readSource(),
        // Anti-automation. Both are checked server-side; neither is visible
        // to, or fillable by, a person using the form normally.
        website: data.get("website") ?? "",
        elapsedMs:
          renderedAt.current === null ? null : Date.now() - renderedAt.current,
      }),
    });

    const payload = (await response.json()) as StoredRegistrant & { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Something went wrong. Please try again.");
      setPending(false);
      return;
    }

    saveRegistrant(payload);
    trackLead({ pixelId, trackLeadEvent, gaId, trackConversion });
    router.push(`/webinar/${webinarId}/thank-you`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {/*
        A field no person can see or reach. Bots fill every input they find, so
        anything in here means the submission was automated.

        Hidden with position and opacity rather than `display: none` or
        `type="hidden"`, both of which the better scrapers know to skip.
        aria-hidden and tabIndex keep it away from screen readers and the tab
        order, so it costs nothing in accessibility.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor="website">Leave this field empty</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <input name="fullName" required autoComplete="name" placeholder="Full name" className={field} />
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email address"
        className={field}
      />

      <div className="flex gap-2">
        <CountrySelector value={country} onChange={setCountry} />
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel-national"
          placeholder="Phone number"
          className={field}
        />
      </div>

      {customFields.map((item) => (
        <div key={item.id}>
          {item.type === "checkbox" ? (
            <label className="flex cursor-pointer items-start gap-2.5 py-1 text-[12.5px] leading-relaxed text-white/70">
              <input
                type="checkbox"
                name={`custom_${item.id}`}
                required={item.required}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--brand)]"
              />
              {item.label}
            </label>
          ) : item.type === "dropdown" ? (
            <select
              name={`custom_${item.id}`}
              required={item.required}
              defaultValue=""
              aria-label={item.label}
              className={field}
            >
              <option value="" disabled className="bg-[#12121A]">
                {item.label}
              </option>
              {(item.options ?? []).map((option) => (
                <option key={option} value={option} className="bg-[#12121A]">
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={`custom_${item.id}`}
              type={item.type === "number" ? "number" : "text"}
              required={item.required}
              placeholder={item.label}
              className={field}
            />
          )}
        </div>
      ))}

      <label className="flex cursor-pointer items-start gap-2.5 pt-1.5 text-[12.5px] leading-relaxed text-white/65">
        <input
          type="checkbox"
          name="gdprConsent"
          required
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--brand)]"
        />
        I agree to receive webinar reminders and follow-up emails. You can
        unsubscribe at any time.
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-[#FF3B3B]/10 px-3.5 py-2.5 text-[12.5px] text-[#FF3B3B]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !hydrated}
        style={{
          background: buttonColour,
          boxShadow: `0 12px 40px -10px ${buttonColour}`,
        }}
        className={cn(
          "group mt-1 flex h-[52px] w-full items-center justify-center gap-2 rounded-full",
          "text-[15px] font-semibold text-white transition-all duration-200",
          "hover:brightness-110 active:scale-[0.99]",
          "disabled:pointer-events-none disabled:opacity-60"
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Reserving your spot…
          </>
        ) : (
          <>
            {ctaText}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <p className="pt-1 text-center text-[11.5px] text-white/45">
        Free to attend · Seats are limited
      </p>
    </form>
  );
}
