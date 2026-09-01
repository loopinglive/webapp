"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Check, CheckCircle2, Copy, Link2 } from "lucide-react";

import { LocalTime } from "@/components/webinar/LocalTime";
import { useIsHydrated } from "@/hooks/useIsHydrated";
import { cn } from "@/lib/utils";
import type { RegistrationConfig } from "@/types";

const REDIRECT_SECONDS = 5;

function calendarLinks(title: string, startsAt: string, durationSeconds: number, url: string) {
  const start = new Date(startsAt);
  const end = new Date(start.getTime() + durationSeconds * 1000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const details = `Your webinar link: ${url}`;

  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${stamp(start)}/${stamp(end)}&details=${encodeURIComponent(details)}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${start.toISOString()}&enddt=${end.toISOString()}&body=${encodeURIComponent(details)}`,
    // .ics as a data URI covers Apple Calendar and anything else that reads ics.
    ics: `data:text/calendar;charset=utf8,${encodeURIComponent(
      `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${stamp(start)}\nDTEND:${stamp(end)}\nSUMMARY:${title}\nDESCRIPTION:${details}\nURL:${url}\nEND:VEVENT\nEND:VCALENDAR`
    )}`,
  };
}

export function ThankYouContent({
  webinarId,
  config,
  webinarTitle,
  startsAt,
  durationSeconds,
}: {
  webinarId: string;
  config: RegistrationConfig;
  webinarTitle: string;
  startsAt: string | null;
  durationSeconds: number;
}) {
  const hydrated = useIsHydrated();
  const [remaining, setRemaining] = useState(REDIRECT_SECONDS);
  const [copied, setCopied] = useState(false);

  const redirectTo = config.thank_you_redirect_url;

  useEffect(() => {
    if (!redirectTo) return;
    const id = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(id);
          window.location.href = redirectTo;
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [redirectTo]);

  const joinUrl = hydrated
    ? `${window.location.origin}/webinar/${webinarId}/waiting-room`
    : "";
  const calendar =
    startsAt && hydrated
      ? calendarLinks(webinarTitle, startsAt, durationSeconds, joinUrl)
      : null;

  const shareText = `I just registered for ${webinarTitle}`;

  return (
    <div
      className="grid min-h-dvh place-items-center px-5 py-16"
      style={{
        background:
          config.background_type === "dark"
            ? "#0A0A0F"
            : config.background_value,
        ["--brand" as string]: config.primary_colour,
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#12121A]/85 px-8 py-12 text-center backdrop-blur-2xl">
        <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: "var(--brand)" }} />

        <h1 className="mt-6 text-balance text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white">
          {config.thank_you_headline}
        </h1>

        {config.thank_you_subheadline && (
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/70">
            {config.thank_you_subheadline}
          </p>
        )}

        {startsAt && (
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-4 py-2 text-[13.5px] text-white">
            <LocalTime iso={startsAt} />
          </p>
        )}

        {redirectTo && (
          <p className="mt-6 text-[13px] text-white/60">
            Redirecting in {remaining} second{remaining === 1 ? "" : "s"}…
          </p>
        )}

        {config.show_add_to_calendar && calendar && (
          <div className="mt-8">
            <p className="mb-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              <CalendarPlus className="h-3 w-3" />
              Add to calendar
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: "Google", href: calendar.google },
                { label: "Outlook", href: calendar.outlook },
                { label: "Apple", href: calendar.ics },
              ].map((option) => (
                <a
                  key={option.label}
                  href={option.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/12 px-4 py-2 text-[12.5px] text-white/80 transition-colors hover:border-[var(--brand)] hover:text-white"
                >
                  {option.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {config.show_social_share && hydrated && (
          <div className="mt-7">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
              Tell someone
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                {
                  label: "WhatsApp",
                  href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${joinUrl}`)}`,
                },
                {
                  label: "X",
                  href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(joinUrl)}`,
                },
                {
                  label: "Facebook",
                  href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(joinUrl)}`,
                },
              ].map((option) => (
                <a
                  key={option.label}
                  href={option.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/12 px-4 py-2 text-[12.5px] text-white/80 transition-colors hover:border-[var(--brand)] hover:text-white"
                >
                  {option.label}
                </a>
              ))}

              <button
                onClick={() => {
                  void navigator.clipboard.writeText(joinUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-[12.5px] transition-colors",
                  copied ? "border-[#00C851] text-[#00C851]" : "text-white/80 hover:text-white"
                )}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        )}

        <a
          href={`/webinar/${webinarId}/waiting-room`}
          className="mt-9 inline-flex h-12 items-center gap-2 rounded-full px-7 text-[15px] font-semibold text-white transition-[filter] hover:brightness-110"
          style={{
            background: config.primary_colour,
            boxShadow: `0 12px 40px -10px ${config.primary_colour}`,
          }}
        >
          <Link2 className="h-4 w-4" />
          Go to the waiting room
        </a>
      </div>
    </div>
  );
}
