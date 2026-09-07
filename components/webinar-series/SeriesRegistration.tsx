"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { CountrySelector } from "@/components/registration/CountrySelector";
import { useIsHydrated } from "@/hooks/useIsHydrated";
import { DEFAULT_COUNTRY, type Country } from "@/lib/countries";
import { saveRegistrant } from "@/lib/registrant-storage";
import { cn } from "@/lib/utils";

const field = cn(
  "h-[52px] w-full rounded-lg border border-white/10 bg-black/25 px-4 text-sm text-white",
  "placeholder:text-white/40 transition-colors duration-200",
  "hover:border-white/20",
  "focus:border-[#6C47FF] focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/25"
);

/**
 * Registers for the series' first webinar, then enrols the same person in
 * series-wide progress tracking. Subsequent items unlock automatically as
 * each prior webinar is watched to completion (see `handleWebinarCompletion`).
 */
export function SeriesRegistration({
  seriesId,
  firstWebinarId,
  ctaText = "Join the Series →",
}: {
  seriesId: string;
  firstWebinarId: string;
  ctaText?: string;
}) {
  const router = useRouter();
  const hydrated = useIsHydrated();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const renderedAt = useRef<number | null>(null);

  useEffect(() => {
    renderedAt.current = Date.now();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") ?? "");
    const email = String(data.get("email") ?? "");

    const response = await fetch(`/api/webinar/${firstWebinarId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        email,
        phone: String(data.get("phone") ?? ""),
        countryCode: country.code,
        gdprConsent: data.get("gdprConsent") === "on",
        website: String(data.get("website") ?? ""),
        elapsedMs: renderedAt.current ? Date.now() - renderedAt.current : undefined,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Something went wrong. Please try again.");
      setPending(false);
      return;
    }

    await fetch(`/api/series/${seriesId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName }),
    });

    saveRegistrant({
      id: payload.id,
      webinarId: firstWebinarId,
      sessionId: payload.sessionId,
      fullName: payload.fullName,
      countryFlag: payload.countryFlag,
    });

    router.push(`/webinar/${firstWebinarId}/waiting-room`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <input type="text" name="fullName" placeholder="Full name" required className={field} />
      <input type="email" name="email" placeholder="Email address" required className={field} />

      <div className="flex gap-2">
        {hydrated && <CountrySelector value={country} onChange={setCountry} />}
        <input type="tel" name="phone" placeholder="Phone number" required className={field} />
      </div>

      <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-white/60">
        <input type="checkbox" name="gdprConsent" required className="mt-0.5 h-4 w-4 accent-[#6C47FF]" />
        I agree to receive emails about this series and accept the privacy policy.
      </label>

      {error && <p className="text-[13px] text-[#FF5A5A]">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#6C47FF] text-[14px] font-semibold text-white transition hover:bg-[#7C57FF] disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {ctaText}
      </button>
    </form>
  );
}
