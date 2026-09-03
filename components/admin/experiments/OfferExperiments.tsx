"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Loader2, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { cn, formatOffset } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  is_control: boolean;
  weight: number;
  offer_title: string | null;
  button_text: string | null;
  price_cents: number | null;
  trigger_video_offset_seconds: number | null;
};

type Result = {
  variant_id: string;
  name: string;
  is_control: boolean;
  assigned: number;
  clicked: number;
  bought: number;
  revenue_cents: number;
  conversion: number;
};

type Payload = {
  baseOffer: {
    offer_title: string;
    button_text: string;
    price_cents: number;
    currency: string;
    trigger_video_offset_seconds: number;
  } | null;
  variants: Variant[];
  results: Result[];
};

/**
 * A rule of thumb, not statistics.
 *
 * Below this many assignments per arm, a difference is noise. Saying so
 * plainly is more useful than showing a percentage that invites someone to
 * end the test on twelve visitors.
 */
const MIN_PER_ARM = 100;

const money = (cents: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);

export function OfferExperiments({ webinarId }: { webinarId: string }) {
  const toast = useToast();
  const [data, setData] = useState<Payload | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [weight, setWeight] = useState("50");
  const [isControl, setIsControl] = useState(false);
  const [title, setTitle] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [price, setPrice] = useState("");
  const [reveal, setReveal] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/experiments`, {
      cache: "no-store",
    });
    if (response.ok) setData((await response.json()) as Payload);
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function create() {
    setBusy(true);
    const response = await fetch(`/api/admin/webinar/${webinarId}/experiments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        weight: Number(weight) || 50,
        isControl,
        offerTitle: title || null,
        buttonText: buttonText || null,
        priceCents: price ? Math.round(Number(price) * 100) : null,
        triggerVideoOffsetSeconds: reveal ? Number(reveal) : null,
      }),
    });

    const payload = (await response.json()) as { error?: string };
    setBusy(false);

    if (!response.ok) {
      toast.error(payload.error ?? "Could not save that variant.");
      return;
    }

    setName("");
    setTitle("");
    setButtonText("");
    setPrice("");
    setReveal("");
    setCreating(false);
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/webinar/${webinarId}/experiments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    toast.success("Variant stopped. Its results are kept.");
    await load();
  }

  if (!data) {
    return (
      <div className="px-6 py-6 lg:px-8">
        <SkeletonRows rows={4} columns={5} />
      </div>
    );
  }

  if (!data.baseOffer) {
    return (
      <div className="px-6 py-10 lg:px-8">
        <EmptyState
          icon="🏷️"
          title="Configure an offer first"
          description="A variant overrides part of the offer, so there has to be one to override."
        />
      </div>
    );
  }

  const base = data.baseOffer;
  const resultsById = new Map(data.results.map((r) => [r.variant_id, r]));
  const control = data.results.find((r) => r.is_control);
  const totalAssigned = data.results.reduce((sum, r) => sum + r.assigned, 0);
  const running = data.variants.length >= 2;

  return (
    <div className="space-y-6 px-6 py-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[60ch]">
          <p className="text-[13px] leading-relaxed text-[#A0A0B0]">
            A variant overrides only what you set — anything left blank inherits from
            the offer. Assignment sticks to a person, so someone returning to a replay
            sees the same price they were shown the first time.
          </p>
          {data.variants.length === 1 && (
            <p className="mt-2 text-[12.5px] text-[#FFB020]">
              One variant is not a test. Nothing is being split until there are two.
            </p>
          )}
        </div>

        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[13px] font-medium text-white hover:bg-[#7C5AFF]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add variant
        </button>
      </div>

      {creating && (
        <div className="max-w-[560px] space-y-3.5 rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <Field label="Name" hint="For you, not for attendees.">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Higher price"
              className={inputClass}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Price" hint={`Base is ${money(base.price_cents, base.currency)}`}>
              <input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="inherit"
                className={inputClass}
              />
            </Field>
            <Field
              label="Reveal at (seconds)"
              hint={`Base is ${formatOffset(base.trigger_video_offset_seconds)}`}
            >
              <input
                inputMode="numeric"
                value={reveal}
                onChange={(e) => setReveal(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="inherit"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Offer title" hint="Blank inherits.">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={base.offer_title}
              className={inputClass}
            />
          </Field>

          <Field label="Button text" hint="Blank inherits.">
            <input
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder={base.button_text}
              className={inputClass}
            />
          </Field>

          <div className="flex flex-wrap items-end gap-4">
            <Field
              label="Weight"
              hint="Relative share of traffic."
              className="w-[120px]"
            >
              <input
                inputMode="numeric"
                value={weight}
                onChange={(e) => setWeight(e.target.value.replace(/[^0-9]/g, ""))}
                className={inputClass}
              />
            </Field>

            <label className="flex cursor-pointer items-center gap-2 pb-2 text-[12.5px] text-[#A0A0B0]">
              <input
                type="checkbox"
                checked={isControl}
                onChange={(e) => setIsControl(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#6C47FF]"
              />
              This is the control
              <HelpTooltip content="The variant everything else is compared against. Setting a new control clears the old one — a test with two controls is not a test." />
            </label>
          </div>

          <button
            onClick={create}
            disabled={busy || !name.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#6C47FF] px-5 text-[13px] font-semibold text-white hover:bg-[#7C5AFF] disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save variant
          </button>
        </div>
      )}

      {data.variants.length === 0 ? (
        <EmptyState
          icon="🧪"
          title="No variants yet"
          description="Add two and traffic splits between them automatically. Until then everyone sees the offer exactly as configured."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1E1E2E]">
          <table className="w-full min-w-[820px]">
            <thead className="bg-[#12121A]">
              <tr>
                {[
                  "Variant",
                  "Overrides",
                  "Weight",
                  "Assigned",
                  "Bought",
                  "Conversion",
                  "Revenue",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6E6E80]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2E]">
              {data.variants.map((variant) => {
                const result = resultsById.get(variant.id);
                const overrides = [
                  variant.price_cents !== null && money(variant.price_cents, base.currency),
                  variant.trigger_video_offset_seconds !== null &&
                    formatOffset(variant.trigger_video_offset_seconds),
                  variant.offer_title && "title",
                  variant.button_text && "button",
                ].filter(Boolean) as string[];

                // Lift against the control, shown only once both arms have
                // enough people for the number to mean anything.
                const comparable =
                  control &&
                  result &&
                  !variant.is_control &&
                  result.assigned >= MIN_PER_ARM &&
                  control.assigned >= MIN_PER_ARM;

                const lift =
                  comparable && control.conversion > 0
                    ? ((result.conversion - control.conversion) / control.conversion) * 100
                    : null;

                return (
                  <tr key={variant.id}>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-white">{variant.name}</span>
                      {variant.is_control && (
                        <span className="ml-2 rounded-full bg-[#1E1E2E] px-2 py-0.5 text-[10px] text-[#A0A0B0]">
                          control
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#A0A0B0]">
                      {overrides.length ? overrides.join(" · ") : "inherits everything"}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {variant.weight}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {result?.assigned ?? 0}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {result?.bought ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12.5px] tabular-nums text-white">
                        {result?.conversion ?? 0}%
                      </span>
                      {lift !== null && (
                        <span
                          className="ml-2 text-[11.5px] tabular-nums"
                          style={{ color: lift >= 0 ? "#00C851" : "#FF6B6B" }}
                        >
                          {lift >= 0 ? "+" : ""}
                          {lift.toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12.5px] tabular-nums text-[#A0A0B0]">
                      {money(result?.revenue_cents ?? 0, base.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(variant.id)}
                        aria-label="Stop this variant"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#1E1E2E] text-[#A0A0B0] hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {running && totalAssigned < MIN_PER_ARM * data.variants.length && (
        <p className="flex items-start gap-2 rounded-xl bg-[#FFB020]/10 px-4 py-3 text-[12.5px] text-[#FFB020]">
          <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Too early to call. With {totalAssigned} people assigned across{" "}
            {data.variants.length} variants, any difference here is noise — wait for
            around {MIN_PER_ARM} per variant before acting on it.
          </span>
        </p>
      )}
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-[#1E1E2E] bg-[#0D0D15] px-3.5 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none";

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[12px] text-[#A0A0B0]">{label}</span>
      {hint && <span className="ml-2 text-[11px] text-[#6E6E80]">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
