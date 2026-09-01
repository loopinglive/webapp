"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { OfferButtonPreview } from "@/components/admin/offer/OfferButtonPreview";
import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { ColourPicker } from "@/components/admin/ui/ColourPicker";
import { TimestampInput } from "@/components/admin/ui/TimestampInput";
import {
  SectionHeader,
  useSetupContext,
} from "@/components/admin/webinar/WebinarSetupShell";
import { cn } from "@/lib/utils";
import type { WebinarOffer } from "@/types";

const ANIMATIONS = [
  { id: "pulse", label: "Pulse" },
  { id: "glow", label: "Glow" },
  { id: "slide", label: "Slide up" },
  { id: "bounce", label: "Bounce" },
] as const;

export function OfferBuilder({ webinarId }: { webinarId: string }) {
  const { webinar, refresh } = useSetupContext();
  const duration = webinar?.video_duration_seconds ?? 0;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    offerTitle: "",
    offerDescription: "",
    buttonText: "Yes! I Want Access Now",
    buttonColour: "#6C47FF",
    buttonAnimation: "pulse" as (typeof ANIMATIONS)[number]["id"],
    triggerVideoOffsetSeconds: 0,
    countdownEnabled: false,
    countdownMinutes: 30,
    opensIn: "modal" as "modal" | "new_tab",
    offerType: "external" as "external" | "internal",
    externalUrl: "",
    internalPageContent: "",
    // Entered in whole currency units, stored in cents.
    price: "",
    currency: "USD",
  });

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/offer`, {
      cache: "no-store",
    });
    if (response.ok) {
      const { offer } = (await response.json()) as { offer: WebinarOffer | null };
      if (offer) {
        setForm({
          offerTitle: offer.offer_title,
          offerDescription: offer.offer_description ?? "",
          buttonText: offer.button_text,
          buttonColour: offer.button_colour,
          buttonAnimation: offer.button_animation,
          triggerVideoOffsetSeconds: offer.trigger_video_offset_seconds,
          countdownEnabled: offer.countdown_enabled,
          countdownMinutes: offer.countdown_minutes,
          opensIn: offer.opens_in,
          offerType: offer.offer_type,
          externalUrl: offer.external_url ?? "",
          internalPageContent:
            typeof offer.internal_page_content === "string"
              ? offer.internal_page_content
              : offer.internal_page_content
                ? JSON.stringify(offer.internal_page_content)
                : "",
          price: offer.price_cents ? (offer.price_cents / 100).toString() : "",
          currency: offer.currency ?? "USD",
        });
      }
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function save() {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/offer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priceCents: Math.round((Number(form.price) || 0) * 100),
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not save the offer.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refresh();
  }

  if (loading) {
    return (
      <div className="grid h-[60dvh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        title="Offer button"
        description="What appears when you reveal the offer, and exactly when."
        action={
          <AdminButton onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : null}
            {saved ? "Saved" : "Save offer"}
          </AdminButton>
        }
      />

      <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="max-w-xl space-y-5">
          <Field label="Offer title" required>
            <TextInput
              value={form.offerTitle}
              onChange={(event) => set("offerTitle", event.target.value)}
              placeholder="The Complete Sales System"
            />
          </Field>

          <Field label="Offer description">
            <TextArea
              rows={2}
              value={form.offerDescription}
              onChange={(event) => set("offerDescription", event.target.value)}
              placeholder="Shown in the offer modal."
            />
          </Field>

          <Field label="Button text" required>
            <TextInput
              value={form.buttonText}
              onChange={(event) => set("buttonText", event.target.value)}
            />
          </Field>

          {/* Analytics can count purchases without this, but not revenue. */}
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field
              label="Price"
              hint="Used to work out revenue in analytics. Leave blank if this offer is free or priced elsewhere."
            >
              <TextInput
                inputMode="decimal"
                value={form.price}
                onChange={(event) =>
                  set("price", event.target.value.replace(/[^0-9.]/g, ""))
                }
                placeholder="997"
              />
            </Field>

            <Field label="Currency">
              <TextInput
                value={form.currency}
                onChange={(event) =>
                  set(
                    "currency",
                    event.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 3)
                  )
                }
                placeholder="USD"
              />
            </Field>
          </div>

          <div>
            <span className="text-[12px] font-medium text-[#A0A0B0]">
              Button colour
            </span>
            <div className="mt-2">
              <ColourPicker
                value={form.buttonColour}
                onChange={(colour) => set("buttonColour", colour)}
              />
            </div>
          </div>

          <div>
            <span className="text-[12px] font-medium text-[#A0A0B0]">Animation</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ANIMATIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => set("buttonAnimation", option.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors duration-200",
                    form.buttonAnimation === option.id
                      ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                      : "border-[#2A2A3A] text-[#A0A0B0] hover:text-white"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Field
            label="Appears at"
            hint={duration ? `video is ${Math.round(duration / 60)} min` : undefined}
          >
            <TimestampInput
              value={form.triggerVideoOffsetSeconds}
              onChange={(seconds) => set("triggerVideoOffsetSeconds", seconds)}
              max={duration}
            />
          </Field>

          <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.countdownEnabled}
                onChange={(event) => set("countdownEnabled", event.target.checked)}
                className="h-4 w-4 accent-[#6C47FF]"
              />
              <span className="text-[13px] text-white">
                Show a countdown on the button
              </span>
            </label>

            {form.countdownEnabled && (
              <div className="mt-3 max-w-[180px]">
                <Field label="Counts down from" hint="minutes">
                  <TextInput
                    type="number"
                    min={1}
                    value={form.countdownMinutes}
                    onChange={(event) =>
                      set("countdownMinutes", Number(event.target.value))
                    }
                  />
                </Field>
              </div>
            )}
          </div>

          <div>
            <span className="text-[12px] font-medium text-[#A0A0B0]">
              Where the offer lives
            </span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                {
                  id: "external" as const,
                  title: "External page",
                  body: "Link to a sales page you already have.",
                },
                {
                  id: "internal" as const,
                  title: "Internal page",
                  body: "Write it here, inside Loopinglive.",
                },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => set("offerType", option.id)}
                  className={cn(
                    "rounded-xl border p-3.5 text-left transition-colors duration-200",
                    form.offerType === option.id
                      ? "border-[#6C47FF] bg-[#6C47FF]/10"
                      : "border-[#2A2A3A] hover:border-[#3A3A4A]"
                  )}
                >
                  <p className="text-[13px] font-medium text-white">
                    {option.title}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#A0A0B0]">
                    {option.body}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {form.offerType === "external" ? (
            <Field label="Sales page URL" required>
              <TextInput
                type="url"
                value={form.externalUrl}
                onChange={(event) => set("externalUrl", event.target.value)}
                placeholder="https://yoursite.com/offer"
              />
            </Field>
          ) : (
            <Field
              label="Page content"
              hint="Headline, bullets, price — plain text for now"
            >
              <TextArea
                rows={8}
                value={form.internalPageContent}
                onChange={(event) =>
                  set("internalPageContent", event.target.value)
                }
                placeholder={"The Complete Sales System\n\n• The offer structure\n• The pricing ladder\n• The follow-up sequences\n\n$997"}
              />
            </Field>
          )}

          <div>
            <span className="text-[12px] font-medium text-[#A0A0B0]">Opens in</span>
            <div className="mt-2 flex items-center gap-1 rounded-full border border-[#2A2A3A] bg-[#1A1A2A] p-1">
              {[
                { id: "modal" as const, label: "Modal (recommended)" },
                { id: "new_tab" as const, label: "New tab" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => set("opensIn", option.id)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 text-[12.5px] transition-colors duration-200",
                    form.opensIn === option.id
                      ? "bg-[#6C47FF] text-white"
                      : "text-[#A0A0B0] hover:text-white"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[12.5px] text-[#FF3B3B]">{error}</p>}
        </div>

        <OfferButtonPreview
          buttonText={form.buttonText}
          buttonColour={form.buttonColour}
          animation={form.buttonAnimation}
          countdownEnabled={form.countdownEnabled}
          countdownMinutes={form.countdownMinutes}
          triggerSeconds={form.triggerVideoOffsetSeconds}
        />
      </div>
    </>
  );
}
