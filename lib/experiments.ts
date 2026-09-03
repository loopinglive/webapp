import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import type { OfferVariantRow, WebinarOfferRow } from "@/types/database";

type Client = ReturnType<typeof createServiceClient>;

/**
 * Picks a variant by weight.
 *
 * A plain weighted draw rather than a hash of the registrant id. Hashing gives
 * deterministic assignment without storage, but it also silently re-assigns
 * everyone the moment a variant is added or removed — which invalidates the
 * experiment you were part-way through. Storing the assignment costs a row and
 * keeps the cohort stable.
 */
function draw(variants: OfferVariantRow[]) {
  const total = variants.reduce((sum, v) => sum + Math.max(0, v.weight), 0);
  if (total <= 0) return variants[0];

  let point = Math.random() * total;
  for (const variant of variants) {
    point -= Math.max(0, variant.weight);
    if (point <= 0) return variant;
  }
  return variants[variants.length - 1];
}

/**
 * The offer this registrant should see, with any variant applied.
 *
 * Assignment is sticky: someone returning to a replay sees the same price they
 * were shown the first time. Being shown one price and charged another is a
 * complaint, not an experiment.
 */
export async function resolveOfferForRegistrant(
  supabase: Client,
  webinarId: string,
  registrantId: string | null,
  offer: WebinarOfferRow
): Promise<{ offer: WebinarOfferRow; variantId: string | null }> {
  if (!registrantId) return { offer, variantId: null };

  const { data: variants } = await supabase
    .from("offer_variants")
    .select("*")
    .eq("webinar_id", webinarId)
    .eq("is_active", true);

  // No experiment running: the base offer is the offer.
  if (!variants || variants.length < 2) return { offer, variantId: null };

  const { data: existing } = await supabase
    .from("offer_assignments")
    .select("variant_id")
    .eq("registrant_id", registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  let variant = existing
    ? variants.find((v) => v.id === existing.variant_id)
    : undefined;

  if (!variant) {
    variant = draw(variants);

    // ignoreDuplicates: two tabs opening at once must not fight over the
    // assignment, and whichever wrote first is the one that counts.
    await supabase
      .from("offer_assignments")
      .upsert(
        { registrant_id: registrantId, webinar_id: webinarId, variant_id: variant.id },
        { onConflict: "registrant_id,webinar_id", ignoreDuplicates: true }
      );
  }

  // Null means inherit, so only the fields under test are overridden.
  return {
    offer: {
      ...offer,
      offer_title: variant.offer_title ?? offer.offer_title,
      button_text: variant.button_text ?? offer.button_text,
      price_cents: variant.price_cents ?? offer.price_cents,
      trigger_video_offset_seconds:
        variant.trigger_video_offset_seconds ?? offer.trigger_video_offset_seconds,
    },
    variantId: variant.id,
  };
}
