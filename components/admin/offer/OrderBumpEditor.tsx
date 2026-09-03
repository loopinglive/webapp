"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";

import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import type { WebinarOfferBump } from "@/types";

/**
 * The one companion offer at checkout.
 *
 * The single highest-return addition in any checkout, and the audience for
 * this product expects it. Kept to one, not a list — several add-ons turns a
 * checkout from a decision already made back into one to reconsider.
 *
 * Its own component rather than folded into the offer form: the offer and the
 * bump save independently, and the offer must not need a bump to exist.
 */
export function OrderBumpEditor({
  webinarId,
  hasOffer,
}: {
  webinarId: string;
  hasOffer: boolean;
}) {
  const [bump, setBump] = useState<WebinarOfferBump | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/webinar/${webinarId}/offer`, {
      cache: "no-store",
    });
    if (response.ok) {
      const { bump: current } = (await response.json()) as {
        bump: WebinarOfferBump | null;
      };
      setBump(current);
      if (current) {
        setTitle(current.title);
        setDescription(current.description ?? "");
        setPrice((current.price_cents / 100).toString());
      }
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save() {
    if (!title.trim() || !price) return;
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/offer/bump`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        price,
        currency: bump?.currency ?? "USD",
        isActive: true,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not save that.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  }

  async function remove() {
    if (!window.confirm("Remove the order bump?")) return;
    setSaving(true);
    await fetch(`/api/admin/webinar/${webinarId}/offer/bump`, { method: "DELETE" });
    setSaving(false);
    setBump(null);
    setTitle("");
    setDescription("");
    setPrice("");
  }

  if (loading) return null;

  if (!hasOffer) {
    return (
      <p className="rounded-xl border border-dashed border-[#2A2A3A] px-4 py-4 text-center text-[12px] text-[#6E6E80]">
        Set a price on the offer above, then a bump can attach to it.
      </p>
    );
  }

  return (
    <div className="space-y-3.5 rounded-2xl border border-[#1E1E2E] p-4">
      <div>
        <h3 className="text-[13px] font-semibold text-white">Order bump</h3>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#6E6E80]">
          A one-click add-on shown at checkout, unticked by default. Never
          pre-checked — that is a charge someone did not choose.
        </p>
      </div>

      <Field label="What is it">
        <TextInput
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="The implementation workbook"
        />
      </Field>

      <Field label="One line about it" hint="Optional">
        <TextArea
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="47 pages, the exact templates I use with clients."
        />
      </Field>

      <Field label="Price">
        <TextInput
          type="number"
          min="0.01"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="27.00"
        />
      </Field>

      {error && <p className="text-[12px] text-[#FF3B3B]">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <AdminButton onClick={save} disabled={saving || !title.trim() || !price}>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {bump ? "Save changes" : "Add the bump"}
        </AdminButton>

        {bump && (
          <button
            onClick={() => void remove()}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-[#6E6E80] hover:text-[#FF5A5A] disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
