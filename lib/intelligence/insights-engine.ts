import "server-only";

import {
  abTestWinnerInsight,
  funnelInsights,
  hotLeadsInsight,
  scheduleRecommendationInsight,
  type FunnelComparison,
  type InsightCandidate,
} from "@/lib/intelligence/insights";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type Client = ReturnType<typeof createServiceClient>;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatHour(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${period} UTC`;
}

async function gatherFunnelComparison(supabase: Client, webinarId: string): Promise<FunnelComparison> {
  const now = Date.now();
  const oneWeekAgo = new Date(now - 7 * 86_400_000).toISOString();
  const twoWeeksAgo = new Date(now - 14 * 86_400_000).toISOString();

  const [{ data: registrants }, { data: purchases }] = await Promise.all([
    supabase
      .from("registrants")
      .select("created_at, attended")
      .eq("webinar_id", webinarId)
      .eq("is_test", false)
      .gte("created_at", twoWeeksAgo),
    supabase
      .from("purchases")
      .select("created_at")
      .eq("webinar_id", webinarId)
      .gte("created_at", twoWeeksAgo),
  ]);

  const isCurrent = (iso: string) => iso >= oneWeekAgo;

  const current = (registrants ?? []).filter((r) => isCurrent(r.created_at));
  const previous = (registrants ?? []).filter((r) => !isCurrent(r.created_at));
  const currentAttended = current.filter((r) => r.attended).length;
  const previousAttended = previous.filter((r) => r.attended).length;
  const currentPurchases = (purchases ?? []).filter((p) => isCurrent(p.created_at)).length;
  const previousPurchases = (purchases ?? []).filter((p) => !isCurrent(p.created_at)).length;

  const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

  return {
    currentRegistrants: current.length,
    previousRegistrants: previous.length,
    currentAttendanceRate: rate(currentAttended, current.length),
    previousAttendanceRate: rate(previousAttended, previous.length),
    currentConversionRate: rate(currentPurchases, currentAttended),
    previousConversionRate: rate(previousPurchases, previousAttended),
  };
}

async function gatherHotLeadsCount(supabase: Client, webinarId: string): Promise<number> {
  const { data: scores } = await supabase
    .from("attendee_scores")
    .select("registrant_id")
    .eq("webinar_id", webinarId)
    .gte("engagement_score", 80);

  const registrantIds = (scores ?? []).map((s) => s.registrant_id);
  if (registrantIds.length === 0) return 0;

  const { data: registrants } = await supabase
    .from("registrants")
    .select("id, bought")
    .in("id", registrantIds);

  return (registrants ?? []).filter((r) => !r.bought).length;
}

async function gatherAbTestWinner(supabase: Client, webinarId: string): Promise<InsightCandidate | null> {
  const { data: test } = await supabase
    .from("ab_tests")
    .select("name, winner, confidence_level")
    .eq("webinar_id", webinarId)
    .eq("status", "running")
    .not("winner", "is", null)
    .order("confidence_level", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!test || !test.winner) return null;
  return abTestWinnerInsight({
    testName: test.name,
    winner: test.winner as "a" | "b",
    confidenceLevel: test.confidence_level ?? 0,
  });
}

async function gatherScheduleRecommendation(supabase: Client, webinarId: string): Promise<InsightCandidate | null> {
  const { data: optimisation } = await supabase
    .from("schedule_optimisations")
    .select("recommended_times, confidence_score, applied")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!optimisation || optimisation.applied) return null;

  const top = (optimisation.recommended_times as unknown as { dayOfWeek: number; hour: number; attendanceRate: number | null }[])?.[0];
  if (!top) return null;

  return scheduleRecommendationInsight({
    dayLabel: DAYS[top.dayOfWeek] ?? "that day",
    hourLabel: formatHour(top.hour),
    attendanceRate: top.attendanceRate,
    confidenceScore: optimisation.confidence_score ?? 0,
  });
}

/**
 * Generates fresh insight cards from this webinar's real signals and saves
 * any that are new, skipping ones that were already raised (same type,
 * still active) in the last 24 hours -- a host's feed should not fill up
 * with the same observation five times because the cron ran five times.
 */
export async function generateInsightsForWebinar(supabase: Client, webinarId: string, ownerId: string | null) {
  const [funnel, hotLeadCount, abWinner, scheduleRec] = await Promise.all([
    gatherFunnelComparison(supabase, webinarId),
    gatherHotLeadsCount(supabase, webinarId),
    gatherAbTestWinner(supabase, webinarId),
    gatherScheduleRecommendation(supabase, webinarId),
  ]);

  const candidates: InsightCandidate[] = [
    ...funnelInsights(funnel),
    ...(hotLeadsInsight(hotLeadCount) ? [hotLeadsInsight(hotLeadCount)!] : []),
    ...(abWinner ? [abWinner] : []),
    ...(scheduleRec ? [scheduleRec] : []),
  ];

  if (candidates.length === 0) return [];

  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data: recent } = await supabase
    .from("ai_insights")
    .select("insight_type")
    .eq("webinar_id", webinarId)
    .eq("is_dismissed", false)
    .gte("created_at", since);

  const recentTypes = new Set((recent ?? []).map((r) => r.insight_type));
  const fresh = candidates.filter((c) => !recentTypes.has(c.insightType));

  if (fresh.length === 0) return [];

  const { data: inserted } = await supabase
    .from("ai_insights")
    .insert(
      fresh.map((candidate) => ({
        user_id: ownerId,
        webinar_id: webinarId,
        insight_type: candidate.insightType,
        title: candidate.title,
        body: candidate.body,
        action_items: candidate.actionItems as unknown as Json,
        priority: candidate.priority,
      }))
    )
    .select("*");

  return inserted ?? [];
}
