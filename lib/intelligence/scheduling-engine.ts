import "server-only";

import { analyzeTimeSlots, recommendTimes, type SessionRecord } from "@/lib/intelligence/scheduling";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type Client = ReturnType<typeof createServiceClient>;

async function gatherSessionRecords(supabase: Client, webinarId: string): Promise<SessionRecord[]> {
  const { data: sessions } = await supabase
    .from("webinar_sessions")
    .select("id, starts_at")
    .eq("webinar_id", webinarId)
    .eq("is_test", false)
    .eq("status", "ended");

  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);
  const { data: registrants } = await supabase
    .from("registrants")
    .select("session_id, attended")
    .in("session_id", sessionIds)
    .eq("is_test", false);

  const bySession = new Map<string, { registered: number; attended: number }>();
  for (const registrant of registrants ?? []) {
    if (!registrant.session_id) continue;
    const bucket = bySession.get(registrant.session_id) ?? { registered: 0, attended: 0 };
    bucket.registered += 1;
    if (registrant.attended) bucket.attended += 1;
    bySession.set(registrant.session_id, bucket);
  }

  return sessions.map((session) => {
    const date = new Date(session.starts_at);
    const stats = bySession.get(session.id) ?? { registered: 0, attended: 0 };
    return {
      dayOfWeek: date.getUTCDay(),
      hour: date.getUTCHours(),
      registered: stats.registered,
      attended: stats.attended,
    };
  });
}

export type ScheduleRecommendation = Awaited<ReturnType<typeof generateRecommendation>>;

export async function generateRecommendation(supabase: Client, webinarId: string) {
  const records = await gatherSessionRecords(supabase, webinarId);
  const slots = analyzeTimeSlots(records);
  const { recommendations, confidenceScore } = recommendTimes(slots, 3);

  const { data: row, error } = await supabase
    .from("schedule_optimisations")
    .insert({
      webinar_id: webinarId,
      recommended_times: recommendations as unknown as Json,
      analysis_data: slots as unknown as Json,
      based_on_sessions: records.length,
      confidence_score: confidenceScore,
    })
    .select("*")
    .single();

  if (error || !row) throw new Error(error?.message ?? "Could not save recommendation.");

  return { recommendation: row, slots, recommendations, confidenceScore };
}
