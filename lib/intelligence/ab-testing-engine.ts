import "server-only";

import { assignVariant, pickWinner, twoProportionZTest } from "@/lib/intelligence/ab-testing";
import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

/**
 * Buckets one registrant into every currently-running test on their webinar.
 *
 * Called from the register route as a best-effort side effect — a bug here
 * must never be able to fail a registration, so every caller wraps this in
 * its own try/catch rather than trusting it to never throw.
 */
export async function assignRegistrantToRunningTests(
  supabase: Client,
  webinarId: string,
  registrantId: string
): Promise<void> {
  const { data: tests } = await supabase
    .from("ab_tests")
    .select("id, traffic_split")
    .eq("webinar_id", webinarId)
    .eq("status", "running");

  if (!tests || tests.length === 0) return;

  for (const test of tests) {
    const variant = assignVariant(registrantId, test.traffic_split);

    const { error } = await supabase.from("ab_test_assignments").insert({
      ab_test_id: test.id,
      registrant_id: registrantId,
      variant,
    });
    // A unique (ab_test_id, registrant_id) constraint means a re-registration
    // hits this and correctly no-ops rather than reassigning them.
    if (error) continue;
  }
}

export type AbTestResults = {
  variants: {
    variant: "a" | "b";
    impressions: number;
    conversions: number;
    conversionRate: number;
  }[];
  significance: ReturnType<typeof twoProportionZTest>;
  winner: "a" | "b" | null;
};

/**
 * Recomputes one test's results from the ground truth — live assignments
 * joined against `registrants.bought` — rather than trusting a cached
 * counter that could have drifted. Also refreshes the `ab_test_results`
 * snapshot rows so the leaderboard route and CSV-style exports have
 * something to read without recomputing the join themselves.
 */
export async function computeResults(supabase: Client, testId: string): Promise<AbTestResults> {
  const { data: assignments } = await supabase
    .from("ab_test_assignments")
    .select("registrant_id, variant")
    .eq("ab_test_id", testId);

  const rows = assignments ?? [];
  const registrantIds = rows.map((row) => row.registrant_id);

  const { data: registrants } = registrantIds.length
    ? await supabase.from("registrants").select("id, bought").in("id", registrantIds)
    : { data: [] };

  const boughtById = new Map((registrants ?? []).map((r) => [r.id, r.bought]));

  const tally = { a: { impressions: 0, conversions: 0 }, b: { impressions: 0, conversions: 0 } };
  for (const row of rows) {
    const bucket = row.variant === "b" ? tally.b : tally.a;
    bucket.impressions += 1;
    if (boughtById.get(row.registrant_id)) bucket.conversions += 1;
  }

  const rate = (v: { impressions: number; conversions: number }) =>
    v.impressions ? Math.round((v.conversions / v.impressions) * 1000) / 10 : 0;

  const significance = twoProportionZTest(
    tally.a.conversions,
    tally.a.impressions,
    tally.b.conversions,
    tally.b.impressions
  );
  const winner = pickWinner(rate(tally.a), rate(tally.b), significance);

  const now = new Date().toISOString();
  await Promise.all(
    (["a", "b"] as const).map((variant) =>
      supabase.from("ab_test_results").insert({
        ab_test_id: testId,
        variant,
        impressions: tally[variant].impressions,
        conversions: tally[variant].conversions,
        conversion_rate: rate(tally[variant]),
        statistical_significance: significance.confidenceLevel,
        calculated_at: now,
      })
    )
  );

  if (winner) {
    await supabase
      .from("ab_tests")
      .update({ winner, confidence_level: significance.confidenceLevel })
      .eq("id", testId);
  }

  return {
    variants: (["a", "b"] as const).map((variant) => ({
      variant,
      impressions: tally[variant].impressions,
      conversions: tally[variant].conversions,
      conversionRate: rate(tally[variant]),
    })),
    significance,
    winner,
  };
}
