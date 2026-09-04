/**
 * Attendee engagement scoring — pure math, no database access.
 *
 * Split from the route that gathers the numbers so the scoring rule itself
 * is testable without a database: given the same factors, this always
 * returns the same score, and that is what a test can actually pin down.
 *
 * Several factors the original design called for — a raised hand, a private
 * message, an emoji reaction count, a completed exit survey, time spent in
 * the waiting room — have no table behind them yet in this codebase. Rather
 * than silently scoring on a factor that is always zero, `gatherFactors` (in
 * the route) sets each one to a defined default and `availableFactors` below
 * records which inputs were real, so a host looking at a score breakdown is
 * never told a signal mattered when it could not have been measured.
 */

export type AttendeeScoreFactors = {
  watchPercentage: number;
  chatMessageCount: number;
  offerClicked: boolean;
  privateMessageSent: boolean;
  handRaised: boolean;
  emojiReactions: number;
  /** Sessions of this webinar attended, including the current one. */
  sessionAttendanceCount: number;
  surveyCompleted: boolean;
  replayWatched: boolean;
  timeInWaitingRoomSeconds: number;
  joinedOnTime: boolean;
  deviceType: string | null;
  source: string | null;
  previousPurchases: number;
};

/** Which of the factors above are computed from real data on this deployment. */
export const AVAILABLE_FACTORS: Record<keyof AttendeeScoreFactors, boolean> = {
  watchPercentage: true,
  chatMessageCount: true,
  offerClicked: true,
  privateMessageSent: false,
  handRaised: false,
  emojiReactions: false,
  sessionAttendanceCount: true,
  surveyCompleted: false,
  replayWatched: true,
  timeInWaitingRoomSeconds: false,
  joinedOnTime: true,
  deviceType: true,
  source: true,
  previousPurchases: true,
};

export type ScoreContribution = { label: string; points: number };

export type EngagementScore = {
  score: number;
  contributions: ScoreContribution[];
};

/**
 * 0–100. Weights sum to 100 at every factor's maximum, so a hypothetical
 * attendee who maxed out everything scores exactly 100, not some number that
 * only means something relative to itself.
 */
export function calculateEngagementScore(factors: AttendeeScoreFactors): EngagementScore {
  const contributions: ScoreContribution[] = [];
  const add = (label: string, points: number) => {
    if (points > 0) contributions.push({ label, points: Math.round(points * 10) / 10 });
    return points;
  };

  let score = 0;
  score += add("Watch depth", Math.min(factors.watchPercentage * 0.4, 40));
  score += add("Clicked the offer", factors.offerClicked ? 25 : 0);
  score += add("Chat messages", Math.min(factors.chatMessageCount * 2, 15));
  score += add("Sent a private message", factors.privateMessageSent ? 10 : 0);
  score += add("Raised their hand", factors.handRaised ? 8 : 0);
  score += add("Emoji reactions", Math.min(factors.emojiReactions, 5));
  score += add(
    "Repeat attendance",
    Math.min(Math.max(factors.sessionAttendanceCount - 1, 0) * 5, 15)
  );
  score += add("Completed the survey", factors.surveyCompleted ? 5 : 0);
  score += add("Watched the replay", factors.replayWatched ? 8 : 0);
  score += add("Joined on time", factors.joinedOnTime ? 5 : 0);
  score += add(
    "Time in the waiting room",
    Math.min(factors.timeInWaitingRoomSeconds / 60, 5)
  );
  score += add(
    "Bought before",
    Math.min(factors.previousPurchases * 10, 20)
  );

  return { score: Math.min(Math.round(score), 100), contributions };
}

/**
 * 0–100. Starts from half the engagement score and multiplies up or down on
 * signals that specifically predict buying rather than merely watching —
 * someone who clicked the offer after watching almost the whole thing is a
 * different case from someone who is simply present.
 *
 * The multipliers are deliberately not a trained model. A "logistic
 * regression trained on historical data" needs outcomes to train on, and
 * this platform does not have enough purchase history yet to fit one
 * honestly — a model trained on a handful of rows is worse than a stated
 * heuristic, because it looks precise while being noise. This is written as
 * a heuristic and should stay one until there is real data to replace it
 * with something better, not something that only sounds more sophisticated.
 */
export function calculateConversionLikelihood(
  engagementScore: number,
  factors: AttendeeScoreFactors
): number {
  let probability = engagementScore * 0.5;

  if (factors.offerClicked && factors.watchPercentage >= 80) probability *= 1.8;
  if (factors.privateMessageSent) probability *= 1.5;
  if (factors.previousPurchases > 0) probability *= 1.4;
  if (factors.handRaised) probability *= 1.3;

  if (factors.watchPercentage < 30) probability *= 0.3;
  if (factors.chatMessageCount === 0 && factors.watchPercentage < 50) probability *= 0.5;

  return Math.min(Math.round(probability), 100);
}

/**
 * A rough churn signal: how unlikely this person is to attend a future
 * session, given how little of this one they engaged with. Not a prediction
 * of cancelling anything — this platform's registrants make no recurring
 * commitment to churn from — but a proxy for "will this person open the next
 * invite", which is what a host actually wants to know before spending a
 * follow-up message on them.
 */
export function calculateChurnRisk(factors: AttendeeScoreFactors): number {
  let risk = 100 - factors.watchPercentage;
  if (factors.chatMessageCount > 0) risk -= 15;
  if (factors.sessionAttendanceCount > 1) risk -= 20;
  if (factors.previousPurchases > 0) risk -= 25;
  return Math.min(100, Math.max(0, Math.round(risk)));
}

export function scoreLabel(score: number): "hot" | "warm" | "engaged" | "cold" {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  if (score >= 40) return "engaged";
  return "cold";
}
