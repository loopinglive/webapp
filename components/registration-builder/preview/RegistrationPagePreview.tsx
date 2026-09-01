"use client";

import { CalendarClock, Check, Users } from "lucide-react";

import { CountrySelector } from "@/components/registration/CountrySelector";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { cn } from "@/lib/utils";
import type { CustomField, RegistrationConfig } from "@/types";

/**
 * The registration page, driven by config rather than the database.
 *
 * This is the single renderer: the builder feeds it local state for the live
 * preview, and the public page feeds it the saved row. One component means the
 * preview cannot drift from what attendees actually get.
 */
export function RegistrationPagePreview({
  config,
  registrantCount = 0,
  sessionTime,
  compact = false,
  interactive = false,
  children,
}: {
  config: RegistrationConfig;
  registrantCount?: number;
  sessionTime?: React.ReactNode;
  /** Mobile frame: stack and shrink. */
  compact?: boolean;
  /** The real page passes its working form in; the preview renders a dummy. */
  interactive?: boolean;
  children?: React.ReactNode;
}) {
  const bullets = (
    Array.isArray(config.what_you_will_learn) ? config.what_you_will_learn : []
  ) as string[];

  const fields = (
    Array.isArray(config.custom_fields) ? config.custom_fields : []
  ) as CustomField[];

  const socialProof =
    config.social_proof_count + (config.show_attendee_count ? registrantCount : 0);

  const background =
    config.background_type === "dark"
      ? "#0A0A0F"
      : config.background_type === "image"
        ? undefined
        : config.background_value;

  return (
    <div
      className="min-h-full w-full"
      style={{
        background,
        backgroundImage:
          config.background_type === "image" && config.background_value
            ? `url(${config.background_value})`
            : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        // Consumed by every accent below, so a colour change repaints at once.
        ["--brand" as string]: config.primary_colour,
        ["--brand-2" as string]: config.secondary_colour,
      }}
    >
      <div
        className={cn(
          "mx-auto w-full px-5",
          compact ? "py-8" : "max-w-6xl px-5 py-14 lg:py-20"
        )}
      >
        {config.logo_url && (
          // Host-uploaded, arbitrary storage path.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.logo_url}
            alt=""
            className={cn("mb-8 object-contain", compact ? "h-7" : "h-9")}
          />
        )}

        <div
          className={cn(
            "grid items-start gap-10",
            !compact && "lg:grid-cols-[1.05fr_440px] lg:gap-16"
          )}
        >
          <div>
            <h1
              className={cn(
                "text-balance font-semibold leading-[1.06] tracking-[-0.035em] text-white",
                compact ? "text-[26px]" : "text-4xl sm:text-5xl"
              )}
            >
              {config.headline}
            </h1>

            {config.subheadline && (
              <p
                className={cn(
                  "mt-4 text-pretty leading-relaxed text-white/70",
                  compact ? "text-[14px]" : "text-[16.5px]"
                )}
              >
                {config.subheadline}
              </p>
            )}

            {config.show_session_time && sessionTime && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/25 px-3.5 py-1.5 text-[13px] text-white/85 backdrop-blur-sm">
                <CalendarClock className="h-3.5 w-3.5" style={{ color: "var(--brand)" }} />
                {sessionTime}
              </p>
            )}

            {bullets.length > 0 && (
              <ul className={cn("space-y-3", compact ? "mt-6" : "mt-9")}>
                {bullets.map((bullet, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                      style={{ background: "color-mix(in oklab, var(--brand) 22%, transparent)" }}
                    >
                      <Check className="h-3 w-3" style={{ color: "var(--brand)" }} />
                    </span>
                    <span
                      className={cn(
                        "leading-relaxed text-white/85",
                        compact ? "text-[13px]" : "text-[15px]"
                      )}
                    >
                      {bullet}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {(config.host_name || config.host_avatar_url) && (
              <div className="mt-9 flex items-center gap-3">
                {config.host_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.host_avatar_url}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="grid h-11 w-11 place-items-center rounded-full text-[13px] font-semibold text-white"
                    style={{ background: "var(--brand)" }}
                  >
                    {(config.host_name ?? "?").slice(0, 1)}
                  </span>
                )}
                <div>
                  <p className="text-[14px] font-semibold text-white">
                    {config.host_name}
                  </p>
                  {config.host_title && (
                    <p className="text-[12.5px] text-white/60">{config.host_title}</p>
                  )}
                </div>
              </div>
            )}

            {socialProof > 0 && (
              <p className="mt-7 inline-flex items-center gap-2 text-[13px] text-white/65">
                <Users className="h-3.5 w-3.5" style={{ color: "var(--brand-2)" }} />
                <span className="font-semibold text-white">
                  {socialProof.toLocaleString()}
                </span>
                {config.social_proof_label}
              </p>
            )}
          </div>

          {/* Form */}
          <div className="rounded-xl border border-white/10 bg-[#12121A]/85 p-6 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-7">
            {interactive ? (
              children
            ) : (
              <DummyForm config={config} fields={fields} compact={compact} />
            )}
          </div>
        </div>
      </div>

      {config.custom_css && <style>{config.custom_css}</style>}
    </div>
  );
}

/** Non-functional replica for the builder preview. */
function DummyForm({
  config,
  fields,
  compact,
}: {
  config: RegistrationConfig;
  fields: CustomField[];
  compact: boolean;
}) {
  const input =
    "h-[46px] w-full rounded-lg border border-white/10 bg-black/25 px-3.5 text-[13px] text-white/45 flex items-center";

  return (
    <div className="space-y-3">
      <div className={input}>Full name</div>
      <div className={input}>Email address</div>
      <div className="flex gap-2">
        <div className="pointer-events-none opacity-90">
          <CountrySelector value={DEFAULT_COUNTRY} onChange={() => {}} />
        </div>
        <div className={input}>Phone number</div>
      </div>

      {fields.map((field) => (
        <div key={field.id}>
          <p className="mb-1.5 text-[11.5px] text-white/55">
            {field.label}
            {field.required && <span style={{ color: "var(--brand)" }}> *</span>}
          </p>
          {field.type === "checkbox" ? (
            <div className="flex items-center gap-2 text-[12.5px] text-white/45">
              <span className="h-4 w-4 rounded border border-white/20" />
              {field.label}
            </div>
          ) : field.type === "dropdown" ? (
            <div className={input}>{field.options?.[0] ?? "Choose one"}</div>
          ) : (
            <div className={input}>
              {field.type === "number" ? "0" : field.label}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-start gap-2.5 pt-1 text-[11.5px] leading-relaxed text-white/55">
        <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/20" />
        I agree to receive webinar reminders and follow-up emails.
      </div>

      <div
        className={cn(
          "mt-1 flex h-[50px] items-center justify-center rounded-full font-semibold text-white",
          compact ? "text-[14px]" : "text-[15px]"
        )}
        style={{
          background: config.primary_colour,
          boxShadow: `0 12px 40px -10px ${config.primary_colour}`,
        }}
      >
        {config.cta_button_text}
      </div>
    </div>
  );
}
