"use client";

import Link from "next/link";
import {
  AlertCircle,
  Check,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  ScrollText,
  Smartphone,
} from "lucide-react";

import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { Toggle } from "@/components/registration-builder/sections/Toggle";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { useAutomationSettings } from "@/hooks/useAutomationSettings";
import { cn } from "@/lib/utils";
import type { AutomationSettingsRow } from "@/types/database";

const CHANNELS = [
  {
    id: "email" as const,
    label: "Email",
    icon: Mail,
    colour: "#6C47FF",
    field: "email_enabled" as const,
    note: "Sent through Resend. No per-message cost.",
  },
  {
    id: "sms" as const,
    label: "SMS",
    icon: Smartphone,
    colour: "#00D4FF",
    field: "sms_enabled" as const,
    note: "Sent through Twilio. Charged per message, and the rate depends on the destination country.",
  },
  {
    id: "whatsapp" as const,
    label: "WhatsApp",
    icon: MessageCircle,
    colour: "#00C851",
    field: "whatsapp_enabled" as const,
    note: "Sent through Twilio. Recipients must have opted in, and templates may need Meta approval.",
  },
];

export function AutomationHub({ webinarId }: { webinarId: string }) {
  const { settings, updateSettings, available, stats, saveStatus, loading, error } =
    useAutomationSettings(webinarId);

  if (loading) {
    return (
      <div className="grid h-[60dvh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="grid h-[60dvh] place-items-center px-6 text-center">
        <p className="text-[14px] text-[#A0A0B0]">
          {error ?? "Could not load automation settings."}
        </p>
      </div>
    );
  }

  const set = <K extends keyof AutomationSettingsRow>(
    key: K,
    value: AutomationSettingsRow[K]
  ) => updateSettings({ [key]: value } as Partial<AutomationSettingsRow>);

  return (
    <>
      <SectionHeader
        title="Automation"
        description="Reminders before, follow-up after. Segmented by what each attendee actually did."
        action={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 text-[11.5px]",
                saveStatus === "error" ? "text-[#FF3B3B]" : "text-[#A0A0B0]"
              )}
            >
              {saveStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
              {saveStatus === "saved" && <Check className="h-3 w-3 text-[#00C851]" />}
              {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving" : ""}
            </span>
            <Link href={`/admin/webinar/${webinarId}/automation/templates`}>
              <AdminButton variant="secondary">
                <FileText className="h-3.5 w-3.5" />
                Templates
              </AdminButton>
            </Link>
            <Link href={`/admin/webinar/${webinarId}/automation/logs`}>
              <AdminButton variant="secondary">
                <ScrollText className="h-3.5 w-3.5" />
                Logs
              </AdminButton>
            </Link>
          </div>
        }
      />

      <div className="max-w-4xl space-y-8 px-6 py-8 lg:px-8">
        {/* Channels */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
            Channels
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {CHANNELS.map((channel) => {
              const on = settings[channel.field];
              const configured = available[channel.id];

              return (
                <div
                  key={channel.id}
                  className={cn(
                    "rounded-xl border bg-[#12121A] p-4 transition-colors",
                    on && configured ? "border-[#6C47FF]" : "border-[#1E1E2E]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-lg"
                      style={{ background: `${channel.colour}1F`, color: channel.colour }}
                    >
                      <channel.icon className="h-4 w-4" />
                    </span>

                    <button
                      onClick={() => set(channel.field, !on)}
                      disabled={!configured}
                      aria-label={`Toggle ${channel.label}`}
                      className={cn(
                        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                        on && configured ? "bg-[#6C47FF]" : "bg-[#3A3A4A]",
                        !configured && "opacity-40"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
                          on && configured ? "left-[18px]" : "left-0.5"
                        )}
                      />
                    </button>
                  </div>

                  <p className="mt-3 text-[13.5px] font-medium text-white">
                    {channel.label}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#A0A0B0]">
                    {channel.note}
                  </p>

                  {!configured && (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#FF9500]">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      Not configured on this deployment — add the provider keys to
                      enable it.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sender */}
        <section className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <h2 className="text-[13px] font-semibold text-white">Sender</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="From name">
              <TextInput
                defaultValue={settings.from_name}
                onChange={(event) => set("from_name", event.target.value)}
                placeholder="John from Sales Academy"
              />
            </Field>
            <Field label="From email" hint="use your own domain">
              <TextInput
                type="email"
                defaultValue={settings.from_email}
                onChange={(event) => set("from_email", event.target.value)}
                placeholder="john@salesacademy.com"
              />
            </Field>
            <Field label="Reply-to" hint="optional">
              <TextInput
                type="email"
                defaultValue={settings.reply_to_email ?? ""}
                onChange={(event) => set("reply_to_email", event.target.value)}
              />
            </Field>
            <Field label="SMS sender ID" hint="max 11 characters">
              <TextInput
                maxLength={11}
                defaultValue={settings.sms_sender_id ?? ""}
                onChange={(event) => set("sms_sender_id", event.target.value)}
                placeholder="ACADEMY"
              />
            </Field>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#A0A0B0]">
            Some countries do not support custom sender IDs — a Twilio number is
            used there instead. Deliverability is better from a domain you own and
            have verified with your email provider.
          </p>
        </section>

        {/* Replay */}
        <section className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <h2 className="text-[13px] font-semibold text-white">Replay</h2>
          <div className="mt-4 space-y-4">
            <Toggle
              label="Send a replay link to non-buyers"
              hint="Buyers never get one — they already have the offer."
              checked={settings.replay_enabled}
              onChange={(value) => set("replay_enabled", value)}
            />
            {settings.replay_enabled && (
              <div className="max-w-[200px]">
                <Field label="Stays open for" hint="hours">
                  <TextInput
                    type="number"
                    min={1}
                    defaultValue={settings.replay_duration_hours}
                    onChange={(event) =>
                      set("replay_duration_hours", Number(event.target.value))
                    }
                  />
                </Field>
              </div>
            )}
          </div>
        </section>

        {/* Re-engagement */}
        <section className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <h2 className="text-[13px] font-semibold text-white">Re-engagement</h2>
          <div className="mt-4 space-y-4">
            <Toggle
              label="Bring non-buyers back"
              checked={settings.re_engagement_enabled}
              onChange={(value) => set("re_engagement_enabled", value)}
            />

            {settings.re_engagement_enabled && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="First message after" hint="days">
                    <TextInput
                      type="number"
                      min={1}
                      defaultValue={settings.re_engagement_delay_days}
                      onChange={(event) =>
                        set("re_engagement_delay_days", Number(event.target.value))
                      }
                    />
                  </Field>
                  <Field label="Then every" hint="days">
                    <TextInput
                      type="number"
                      min={1}
                      defaultValue={settings.re_engagement_frequency_days}
                      onChange={(event) =>
                        set(
                          "re_engagement_frequency_days",
                          Number(event.target.value)
                        )
                      }
                    />
                  </Field>
                  <Field label="Stop after" hint="messages">
                    <TextInput
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={settings.max_re_engagement_messages}
                      onChange={(event) =>
                        set(
                          "max_re_engagement_messages",
                          Number(event.target.value)
                        )
                      }
                    />
                  </Field>
                </div>

                <div className="rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
                    Stops automatically when
                  </p>
                  <ul className="mt-2 space-y-1 text-[12px] text-white/75">
                    <li>They register for another session</li>
                    <li>They buy</li>
                    <li>They unsubscribe</li>
                    <li>The message limit above is reached</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Stats */}
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[#1E1E2E] bg-[#1E1E2E]">
          {[
            { label: "Sent", value: stats.sent, tone: "#00C851" },
            { label: "Failed", value: stats.failed, tone: stats.failed ? "#FF3B3B" : undefined },
            { label: "Unsubscribed", value: stats.unsubscribed },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#12121A] px-5 py-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
                {stat.label}
              </dt>
              <dd
                className="mt-1.5 text-2xl font-semibold tabular-nums tracking-[-0.03em] text-white"
                style={stat.tone ? { color: stat.tone } : undefined}
              >
                {stat.value.toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
