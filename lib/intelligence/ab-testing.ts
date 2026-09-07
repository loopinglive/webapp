/**
 * A/B testing — pure math, no database access.
 *
 * Split out the same way `scoring.ts` is: given the same inputs this always
 * returns the same answer, which is what a test can pin down and what keeps
 * the statistics honest — no hidden state, no "it depends what ran before".
 */

/**
 * Deterministic variant assignment from a stable seed (the registrant's own
 * id). Hashed rather than random so the same registrant always lands in the
 * same bucket if this ever needs to be recomputed, and so two requests for
 * the same person in the same test never disagree.
 */
export function assignVariant(seed: string, trafficSplitPercent: number): "a" | "b" {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const bucket = Math.abs(hash) % 100;
  return bucket < trafficSplitPercent ? "a" : "b";
}

/** Standard normal CDF via the Abramowitz–Stegun approximation (error < 1.5e-7). */
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

export type SignificanceResult = {
  zScore: number;
  /** 0–100. Two-tailed: how confident we are the two variants actually differ. */
  confidenceLevel: number;
  /** True once confidence clears 95% and both variants have a meaningful sample. */
  significant: boolean;
};

/**
 * Two-proportion z-test. This is the standard test for "did conversion rate
 * A actually beat conversion rate B, or is that gap just noise" — not a
 * heuristic, an actual statistical test, because a host deciding whether to
 * ship a variant deserves a real answer to that question.
 *
 * Below 30 impressions per variant the result is not flagged significant no
 * matter what the z-score says — a stated minimum sample size, because a
 * z-test on tiny counts produces confident-looking numbers from noise.
 */
export function twoProportionZTest(
  conversionsA: number,
  impressionsA: number,
  conversionsB: number,
  impressionsB: number
): SignificanceResult {
  const MIN_SAMPLE = 30;
  if (impressionsA < MIN_SAMPLE || impressionsB < MIN_SAMPLE) {
    return { zScore: 0, confidenceLevel: 0, significant: false };
  }

  const pA = conversionsA / impressionsA;
  const pB = conversionsB / impressionsB;
  const pooled = (conversionsA + conversionsB) / (impressionsA + impressionsB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / impressionsA + 1 / impressionsB));

  if (se === 0) {
    return { zScore: 0, confidenceLevel: 0, significant: false };
  }

  const zScore = (pA - pB) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));
  const confidenceLevel = Math.max(0, Math.min(100, Math.round((1 - pValue) * 1000) / 10));

  return { zScore: Math.round(zScore * 100) / 100, confidenceLevel, significant: confidenceLevel >= 95 };
}

/** Which variant is ahead, only worth naming once the difference is significant. */
export function pickWinner(
  conversionRateA: number,
  conversionRateB: number,
  significance: SignificanceResult
): "a" | "b" | null {
  if (!significance.significant) return null;
  return conversionRateA >= conversionRateB ? "a" : "b";
}
