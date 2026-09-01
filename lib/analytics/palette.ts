/**
 * Chart colour, validated rather than eyeballed.
 *
 * This exact ordering passed every gate against the `#12121A` chart surface:
 * lightness band L 0.48–0.67, chroma floor, adjacent CVD ΔE 8.4 (protan),
 * normal-vision ΔE 19.3, and ≥3:1 contrast. The *order* is the CVD-safety
 * mechanism, not decoration — reordering these or inserting a hue invalidates
 * the result. Re-run the validator if they ever change.
 */
export const CATEGORICAL = [
  "#6C47FF", // brand accent
  "#D95926",
  "#199E70",
  "#C98500",
  "#D55181",
  "#3987E5",
] as const;

/**
 * A seventh series is never a generated hue. Anything past the palette folds
 * into "Other" so colour keeps meaning identity.
 */
export const OTHER = "#4A4A5C";
export const MAX_SERIES = CATEGORICAL.length;

/** Colour follows the entity, never its rank — index is assigned once, upstream. */
export function seriesColour(index: number) {
  return index < MAX_SERIES ? CATEGORICAL[index] : OTHER;
}

/**
 * Status colours are reserved. They never stand in for "series 4", and they
 * always ship with a label rather than carrying meaning alone.
 */
export const STATUS = {
  good: "#00C851",
  warning: "#FF9500",
  critical: "#FF3B3B",
  attention: "#FFD93D",
} as const;

/** Sequential: one hue, light to dark. Used for the time-slot heatmap only. */
export const SEQUENTIAL = [
  "#1B1B2B",
  "#2A2350",
  "#3A2C79",
  "#4C36A6",
  "#5D40D2",
  "#6C47FF",
] as const;

export function sequentialStep(value: number, max: number) {
  if (!max || value <= 0) return SEQUENTIAL[0];
  const index = Math.min(
    SEQUENTIAL.length - 1,
    Math.max(1, Math.round((value / max) * (SEQUENTIAL.length - 1)))
  );
  return SEQUENTIAL[index];
}

/** Chart chrome. Recessive by design — the data carries the emphasis. */
export const CHART = {
  surface: "#12121A",
  grid: "#1E1E2E",
  axis: "#A0A0B0",
  ink: "#F4F4F8",
  muted: "#A0A0B0",
} as const;
