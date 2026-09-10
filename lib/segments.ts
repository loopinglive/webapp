import type { Registrant } from "@/types";

// Client-safe: the badge, the tabs and the server assignment all read from here
// so there is one definition of what a segment means.

export const SEGMENTS = [
  "REGISTERED",
  "NO_SHOW",
  "WATCHED_LOW",
  "WATCHED_MID_LOW",
  "WATCHED_MID_HIGH",
  "WATCHED_HIGH",
  "WATCHED_COMPLETE",
  "CLICKED_OFFER",
  "BOUGHT",
] as const;

export type Segment = (typeof SEGMENTS)[number];

export const WATCHED_SEGMENTS: Segment[] = [
  "WATCHED_LOW",
  "WATCHED_MID_LOW",
  "WATCHED_MID_HIGH",
  "WATCHED_HIGH",
  "WATCHED_COMPLETE",
];

export const SEGMENT_META: Record<
  Segment,
  { label: string; colour: string; outlined?: boolean }
> = {
  /*
   * "Awaiting session", not "Registered".
   *
   * This bucket is specifically people who signed up for a session that has
   * not run yet — assignSegment only returns it when the webinar has not
   * passed. Everyone in the list is registered, so labelling it "Registered"
   * put the word on screen twice meaning two different things: the header
   * counts every signup ("2 registered for this webinar") while the tile
   * counted only this bucket, which correctly reads 0 once everyone has moved
   * on to no-show or a watch band. Two right numbers that looked like a bug.
   */
  REGISTERED: { label: "Awaiting session", colour: "#6C47FF" },
  NO_SHOW: { label: "No show", colour: "#FF9500" },
  WATCHED_LOW: { label: "0–30%", colour: "#FF6B6B" },
  WATCHED_MID_LOW: { label: "30–50%", colour: "#FF9500" },
  WATCHED_MID_HIGH: { label: "50–70%", colour: "#FFD93D" },
  WATCHED_HIGH: { label: "70–90%", colour: "#00D4FF" },
  WATCHED_COMPLETE: { label: "90–100%", colour: "#00C851" },
  CLICKED_OFFER: { label: "Clicked offer", colour: "#FFD93D", outlined: true },
  BOUGHT: { label: "Bought", colour: "#00C851", outlined: true },
};

type SegmentInput = Pick<
  Registrant,
  "bought" | "clicked_offer" | "attended" | "watch_percentage"
>;

/**
 * The one place a registrant's segment is decided.
 *
 * Order matters and is not negotiable: a buyer is a buyer whatever they
 * watched, and someone who reached the offer is a lead before they are a
 * watch-depth bucket.
 */
export function assignSegment(
  registrant: SegmentInput,
  { webinarHasPassed }: { webinarHasPassed: boolean }
): Segment {
  if (registrant.bought) return "BOUGHT";
  if (registrant.clicked_offer) return "CLICKED_OFFER";

  if (!registrant.attended) {
    return webinarHasPassed ? "NO_SHOW" : "REGISTERED";
  }

  const pct = Number(registrant.watch_percentage ?? 0);
  if (pct >= 90) return "WATCHED_COMPLETE";
  if (pct >= 70) return "WATCHED_HIGH";
  if (pct >= 50) return "WATCHED_MID_HIGH";
  if (pct >= 30) return "WATCHED_MID_LOW";
  return "WATCHED_LOW";
}

/** Colour for a watch-depth bar at a given percentage. */
export function watchDepthColour(percentage: number) {
  if (percentage >= 90) return "#00C851";
  if (percentage >= 70) return "#00D4FF";
  if (percentage >= 50) return "#FFD93D";
  if (percentage >= 30) return "#FF9500";
  return "#FF6B6B";
}

export const WATCH_MILESTONES = [25, 50, 75, 90, 100] as const;
