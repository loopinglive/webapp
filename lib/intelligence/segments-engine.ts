import "server-only";

import { evaluateConditions, type Condition, type PersonalisationContext } from "@/lib/intelligence/personalisation";
import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

/**
 * A segment is the same condition language as personalisation rules,
 * applied differently: instead of "does this one registrant match, so an
 * action can fire", it's "which registrants match, so they can be viewed
 * and exported as a named audience". Same `evaluateConditions`, so the two
 * features can never quietly diverge on what a condition means.
 */
export type SegmentMember = {
  id: string;
  full_name: string;
  email: string;
  context: PersonalisationContext;
};

async function buildContexts(supabase: Client, webinarId: string): Promise<SegmentMember[]> {
  const { data: registrants } = await supabase
    .from("registrants")
    .select("id, full_name, email, device_type, country_code, returning_attendee, watch_percentage, clicked_offer")
    .eq("webinar_id", webinarId)
    .eq("is_test", false);

  if (!registrants || registrants.length === 0) return [];

  const { data: sources } = await supabase
    .from("attendee_sources")
    .select("registrant_id, utm_source")
    .in(
      "registrant_id",
      registrants.map((r) => r.id)
    );

  const sourceById = new Map((sources ?? []).map((s) => [s.registrant_id, s.utm_source]));

  return registrants.map((registrant) => ({
    id: registrant.id,
    full_name: registrant.full_name,
    email: registrant.email,
    context: {
      deviceType: registrant.device_type,
      countryCode: registrant.country_code,
      returningAttendee: registrant.returning_attendee ?? false,
      watchPercentage: registrant.watch_percentage ?? 0,
      clickedOffer: registrant.clicked_offer ?? false,
      utmSource: sourceById.get(registrant.id) ?? null,
    },
  }));
}

export async function evaluateSegmentMembers(
  supabase: Client,
  webinarId: string,
  conditions: Condition[]
): Promise<SegmentMember[]> {
  const all = await buildContexts(supabase, webinarId);
  return all.filter((member) => evaluateConditions(conditions, member.context));
}

/** Recomputes membership and updates the segment's cached count. */
export async function refreshSegment(supabase: Client, segmentId: string): Promise<number> {
  const { data: segment } = await supabase
    .from("smart_segments")
    .select("webinar_id, conditions")
    .eq("id", segmentId)
    .maybeSingle();

  if (!segment) throw new Error("Segment not found.");

  const members = await evaluateSegmentMembers(supabase, segment.webinar_id, segment.conditions as unknown as Condition[]);

  await supabase
    .from("smart_segments")
    .update({ registrant_count: members.length, last_evaluated_at: new Date().toISOString() })
    .eq("id", segmentId);

  return members.length;
}
