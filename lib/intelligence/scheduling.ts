/**
 * Smart scheduling — pure statistics, no database access.
 *
 * Ranks time slots by their actual historical attendance rate. No AI here:
 * "which day and hour did people actually show up for" is a straightforward
 * aggregation, and dressing it up as a model prediction would just be a
 * slower, less honest way of reporting the same average.
 */

export type SessionRecord = {
  /** 0 = Sunday, matching JS Date#getDay(). */
  dayOfWeek: number;
  /** Hour in the webinar's own local reporting, 0–23. */
  hour: number;
  registered: number;
  attended: number;
};

export type SlotStat = {
  dayOfWeek: number;
  hour: number;
  attendanceRate: number;
  sampleSessions: number;
  totalRegistered: number;
  totalAttended: number;
};

/** Groups sessions into day/hour buckets and computes each bucket's real attendance rate. */
export function analyzeTimeSlots(sessions: SessionRecord[]): SlotStat[] {
  const buckets = new Map<string, { registered: number; attended: number; count: number }>();

  for (const session of sessions) {
    const key = `${session.dayOfWeek}:${session.hour}`;
    const bucket = buckets.get(key) ?? { registered: 0, attended: 0, count: 0 };
    bucket.registered += session.registered;
    bucket.attended += session.attended;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries()).map(([key, bucket]) => {
    const [dayOfWeek, hour] = key.split(":").map(Number);
    return {
      dayOfWeek,
      hour,
      attendanceRate: bucket.registered ? Math.round((bucket.attended / bucket.registered) * 1000) / 10 : 0,
      sampleSessions: bucket.count,
      totalRegistered: bucket.registered,
      totalAttended: bucket.attended,
    };
  });
}

// Widely reported industry pattern (GoToWebinar/ON24 attendance studies):
// Tue–Thu, 10am–2pm outperforms Monday and Friday and evening slots. Used
// only as a fallback when there isn't enough of this webinar's own history
// to trust yet, and always labelled as a general-pattern fallback, never
// presented as if it came from this webinar's own data.
const FALLBACK_SLOTS: { dayOfWeek: number; hour: number }[] = [
  { dayOfWeek: 3, hour: 11 },
  { dayOfWeek: 2, hour: 13 },
  { dayOfWeek: 4, hour: 10 },
];

export type Recommendation = {
  dayOfWeek: number;
  hour: number;
  attendanceRate: number | null;
  source: "historical" | "industry_fallback";
};

const MIN_SESSIONS_PER_SLOT = 2;
const MIN_TOTAL_SESSIONS_FOR_CONFIDENCE = 6;

/**
 * Top slots by attendance rate, requiring at least two of this webinar's own
 * sessions in a slot before recommending it — one lucky session is not a
 * pattern. Falls back to the industry-standard slots, clearly labelled,
 * when there simply isn't enough history yet.
 */
export function recommendTimes(
  slots: SlotStat[],
  count: number
): { recommendations: Recommendation[]; confidenceScore: number } {
  const eligible = slots
    .filter((slot) => slot.sampleSessions >= MIN_SESSIONS_PER_SLOT)
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  const totalSessions = slots.reduce((sum, slot) => sum + slot.sampleSessions, 0);

  if (eligible.length === 0) {
    return {
      recommendations: FALLBACK_SLOTS.slice(0, count).map((slot) => ({
        ...slot,
        attendanceRate: null,
        source: "industry_fallback",
      })),
      confidenceScore: 0,
    };
  }

  const recommendations: Recommendation[] = eligible.slice(0, count).map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    hour: slot.hour,
    attendanceRate: slot.attendanceRate,
    source: "historical",
  }));

  // Scales with both how many sessions back this up and how many distinct
  // slots we had to compare — three sessions all in one slot says less than
  // three sessions spread across three real alternatives.
  const confidenceScore = Math.min(
    100,
    Math.round((Math.min(totalSessions / MIN_TOTAL_SESSIONS_FOR_CONFIDENCE, 1) * 70 + Math.min(eligible.length / 4, 1) * 30) * 10) / 10
  );

  return { recommendations, confidenceScore };
}
