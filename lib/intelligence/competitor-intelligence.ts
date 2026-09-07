/**
 * Competitor intelligence — pure math over host-logged observations.
 *
 * There is no live scraping or fetching here: this deployment has no
 * reliable, ToS-respecting way to pull a competitor's current price or
 * offer copy from an arbitrary external site on a schedule. What it does
 * instead is track observations a host records themselves over time
 * (price, offer headline, notes) and surface the trend — a structured
 * competitor log with real derived numbers, not invented ones.
 */

export type Observation = {
  date: string;
  priceCents: number | null;
  offerHeadline: string | null;
  notes: string | null;
};

export type PriceTrend = {
  firstPriceCents: number | null;
  latestPriceCents: number | null;
  changePercent: number | null;
  direction: "up" | "down" | "flat" | "unknown";
  observationCount: number;
};

export function computePriceTrend(observations: Observation[]): PriceTrend {
  const priced = [...observations]
    .filter((o) => o.priceCents !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (priced.length === 0) {
    return { firstPriceCents: null, latestPriceCents: null, changePercent: null, direction: "unknown", observationCount: observations.length };
  }

  const first = priced[0].priceCents!;
  const latest = priced[priced.length - 1].priceCents!;
  const changePercent = first === 0 ? null : Math.round(((latest - first) / first) * 1000) / 10;

  return {
    firstPriceCents: first,
    latestPriceCents: latest,
    changePercent,
    direction: latest === first ? "flat" : latest > first ? "up" : "down",
    observationCount: observations.length,
  };
}
