import "server-only";

import {
  calculateChurnRisk,
  calculateConversionLikelihood,
  calculateEngagementScore,
  AVAILABLE_FACTORS,
  type AttendeeScoreFactors,
} from "@/lib/intelligence/scoring";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type Client = ReturnType<typeof createServiceClient>;

/**
 * Gathers what is actually measurable about one registrant.
 *
 * Shared by the single-score route, the batch route, and the daily cron —
 * three places computing "how engaged is this person" independently is how
 * they end up disagreeing.
 */
export async function gatherFactors(
  supabase: Client,
  registrantId: string
): Promise<AttendeeScoreFactors> {
  const { data: registrant } = await supabase
    .from("registrants")
    .select(
      "webinar_id, session_id, watch_percentage, clicked_offer, total_sessions_attended, device_type, joined_at"
    )
    .eq("id", registrantId)
    .maybeSingle();

  if (!registrant) {
    throw new Error("No such registrant.");
  }

  const [
    { count: chatCount },
    { data: replay },
    { count: purchaseCount },
    { data: source },
    { data: session },
  ] = await Promise.all([
    supabase
      .from("live_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("registrant_id", registrantId)
      .eq("is_real_user", true),
    supabase
      .from("replay_access")
      .select("id")
      .eq("registrant_id", registrantId)
      .maybeSingle(),
    supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("registrant_id", registrantId),
    supabase
      .from("attendee_sources")
      .select("utm_source")
      .eq("registrant_id", registrantId)
      .maybeSingle(),
    registrant.session_id
      ? supabase
          .from("webinar_sessions")
          .select("starts_at")
          .eq("id", registrant.session_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // "On time" means within five minutes of the session's start — a viewer
  // who joins ten minutes early counts as on time too; only lateness counts
  // against them.
  let joinedOnTime = false;
  if (registrant.joined_at && session?.starts_at) {
    const delta =
      new Date(registrant.joined_at).getTime() - new Date(session.starts_at).getTime();
    joinedOnTime = delta <= 5 * 60_000;
  }

  return {
    watchPercentage: registrant.watch_percentage ?? 0,
    chatMessageCount: chatCount ?? 0,
    offerClicked: registrant.clicked_offer ?? false,
    // Not yet measurable on this deployment — see AVAILABLE_FACTORS.
    privateMessageSent: false,
    handRaised: false,
    emojiReactions: 0,
    sessionAttendanceCount: registrant.total_sessions_attended ?? 1,
    surveyCompleted: false,
    replayWatched: Boolean(replay),
    timeInWaitingRoomSeconds: 0,
    joinedOnTime,
    deviceType: registrant.device_type,
    source: source?.utm_source ?? null,
    previousPurchases: purchaseCount ?? 0,
  };
}

export async function scoreRegistrant(
  supabase: Client,
  registrantId: string,
  webinarId: string
) {
  const factors = await gatherFactors(supabase, registrantId);
  const { score: engagementScore, contributions } = calculateEngagementScore(factors);
  const conversionLikelihood = calculateConversionLikelihood(engagementScore, factors);
  const churnRisk = calculateChurnRisk(factors);

  // The actual amount this person has spent with this host — not a
  // predicted figure. A real total beats a modelled "lifetime value
  // estimate" this platform does not have the purchase history to fit
  // honestly.
  const { data: purchases } = await supabase
    .from("purchases")
    .select("amount_cents")
    .eq("registrant_id", registrantId);
  const lifetimeValue =
    (purchases ?? []).reduce((sum, purchase) => sum + purchase.amount_cents, 0) / 100;

  const { error } = await supabase.from("attendee_scores").upsert(
    {
      registrant_id: registrantId,
      webinar_id: webinarId,
      engagement_score: engagementScore,
      conversion_likelihood: conversionLikelihood,
      churn_risk: churnRisk,
      lifetime_value_estimate: lifetimeValue,
      score_factors: {
        factors,
        contributions,
        available: AVAILABLE_FACTORS,
      } as unknown as Json,
      scored_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "registrant_id,webinar_id" }
  );

  if (error) throw new Error(error.message);
  return { engagementScore, conversionLikelihood, churnRisk, lifetimeValue };
}
