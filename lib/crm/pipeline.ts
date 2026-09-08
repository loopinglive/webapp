import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type PipelineStage = { key: string; label: string; probability: number };

/**
 * The stages a webinar lead actually moves through. Deliberately short:
 * a webinar pipeline is not an enterprise sales pipeline, and every extra
 * column is one more thing a host has to drag a card into.
 */
export const DEFAULT_STAGES: PipelineStage[] = [
  { key: "new", label: "New lead", probability: 10 },
  { key: "contacted", label: "Contacted", probability: 25 },
  { key: "qualified", label: "Qualified", probability: 50 },
  { key: "proposal", label: "Proposal sent", probability: 70 },
  { key: "negotiation", label: "Negotiation", probability: 85 },
];

/** The account's default pipeline, created on first use so a host never has to set one up. */
export async function ensureDefaultPipeline(userId: string): Promise<{ id: string; stages: PipelineStage[] } | null> {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("deal_pipelines")
    .select("id, stages")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (existing) return { id: existing.id, stages: (existing.stages as PipelineStage[]) ?? DEFAULT_STAGES };

  const { data: created } = await supabase
    .from("deal_pipelines")
    .insert({
      user_id: userId,
      name: "Webinar pipeline",
      stages: DEFAULT_STAGES as unknown as Json,
      is_default: true,
    })
    .select("id, stages")
    .single();

  if (!created) return null;
  return { id: created.id, stages: (created.stages as PipelineStage[]) ?? DEFAULT_STAGES };
}

/**
 * Opens a deal the moment someone clicks the offer — the point at which a
 * registrant stops being an attendee and starts being a lead worth chasing.
 * Never throws: a CRM problem must not break offer-click tracking, which is
 * what the whole conversion funnel is measured on.
 */
export async function createDealForOfferClick(input: {
  ownerId: string | null;
  webinarId: string;
  registrantId: string;
  registrantName: string;
  offerTitle: string | null;
  valueCents: number | null;
}): Promise<void> {
  if (!input.ownerId) return;

  try {
    const supabase = createServiceClient();
    const pipeline = await ensureDefaultPipeline(input.ownerId);
    if (!pipeline) return;

    const { data: existing } = await supabase
      .from("deals")
      .select("id")
      .eq("pipeline_id", pipeline.id)
      .eq("registrant_id", input.registrantId)
      .maybeSingle();
    if (existing) return;

    await supabase.from("deals").insert({
      pipeline_id: pipeline.id,
      webinar_id: input.webinarId,
      registrant_id: input.registrantId,
      title: `${input.registrantName || "Lead"} — ${input.offerTitle || "Offer"}`,
      value: (input.valueCents ?? 0) / 100,
      stage: pipeline.stages[0]?.key ?? "new",
      probability: pipeline.stages[0]?.probability ?? 10,
      activities: [{ at: new Date().toISOString(), type: "created", detail: "Clicked the offer during the webinar." }] as unknown as Json,
    });
  } catch {
    // Intentionally swallowed — see the doc comment.
  }
}
