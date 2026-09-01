import "server-only";

import { MIN_COMMENTS } from "@/lib/setup-steps";
import { createServiceClient } from "@/lib/supabase/server";
import type { SetupChecklist, Webinar, WebinarSetupPayload } from "@/types";

export { isPublishable, missingSteps, REQUIRED_STEPS } from "@/lib/setup-steps";

/** Everything the sidebar, the overview checklist and the publish gate need. */
export async function getWebinarSetup(
  webinarId: string
): Promise<WebinarSetupPayload | null> {
  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("*")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) return null;

  const count = { count: "exact" as const, head: true };

  const [
    { count: schedules },
    { count: personas },
    { count: comments },
    { count: offers },
    { count: aiPersonas },
    { count: polls },
    { count: handouts },
    { count: ctas },
    { count: pinned },
  ] = await Promise.all([
    supabase
      .from("webinar_schedules")
      .select("id", count)
      .eq("webinar_id", webinarId)
      .eq("is_active", true),
    supabase.from("fake_personas").select("id", count).eq("webinar_id", webinarId),
    supabase.from("timed_comments").select("id", count).eq("webinar_id", webinarId),
    supabase
      .from("webinar_offers")
      .select("id", count)
      .eq("webinar_id", webinarId)
      .eq("is_active", true),
    supabase
      .from("ai_personas")
      .select("id", count)
      .eq("webinar_id", webinarId)
      .eq("is_active", true),
    supabase.from("timed_polls").select("id", count).eq("webinar_id", webinarId),
    supabase.from("timed_handouts").select("id", count).eq("webinar_id", webinarId),
    supabase.from("timed_ctas").select("id", count).eq("webinar_id", webinarId),
    supabase
      .from("timed_pinned_messages")
      .select("id", count)
      .eq("webinar_id", webinarId),
  ]);

  const engagement =
    (polls ?? 0) + (handouts ?? 0) + (ctas ?? 0) + (pinned ?? 0);

  const checklist: SetupChecklist = {
    video: Boolean(webinar.video_url && webinar.video_duration_seconds),
    schedule: (schedules ?? 0) > 0,
    personas: (personas ?? 0) > 0,
    comments: (comments ?? 0) >= MIN_COMMENTS,
    engagement: engagement > 0,
    offer: (offers ?? 0) > 0,
    // Both moderators, per the Phase 2 design.
    ai: (aiPersonas ?? 0) >= 2,
  };

  return {
    webinar: webinar as Webinar,
    checklist,
    counts: {
      schedules: schedules ?? 0,
      personas: personas ?? 0,
      comments: comments ?? 0,
      engagement,
    },
  };
}
