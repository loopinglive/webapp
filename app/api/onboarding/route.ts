import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Setup progress, derived from what exists rather than what was clicked.
 *
 * Someone who builds things out of order, or returns a week later, sees an
 * accurate checklist -- a stored list of "steps they clicked through" drifts
 * away from reality the moment they do anything unusual.
 */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: webinars } = await supabase
    .from("webinars")
    .select("id, video_url, status")
    .eq("owner_id", account.id);

  const ids = (webinars ?? []).map((w) => w.id);
  const completed: string[] = [];

  if (ids.length > 0) completed.push("create_webinar");
  if ((webinars ?? []).some((w) => w.video_url)) completed.push("upload_video");
  if ((webinars ?? []).some((w) => w.status === "published")) completed.push("publish");

  if (ids.length > 0) {
    const [{ data: personas }, { data: schedules }, { data: offers }] = await Promise.all([
      supabase.from("fake_personas").select("webinar_id").in("webinar_id", ids),
      supabase.from("webinar_schedules").select("id").in("webinar_id", ids).limit(1),
      supabase.from("webinar_offers").select("id").in("webinar_id", ids).limit(1),
    ]);

    // Three or more on any one webinar, which is what the step asks for.
    const perWebinar = new Map<string, number>();
    for (const row of personas ?? []) {
      perWebinar.set(row.webinar_id, (perWebinar.get(row.webinar_id) ?? 0) + 1);
    }
    if ([...perWebinar.values()].some((count) => count >= 3)) completed.push("add_personas");
    if (schedules?.length) completed.push("set_schedule");
    if (offers?.length) completed.push("configure_offer");
  }

  const { data: progress } = await supabase
    .from("onboarding_progress")
    .select("dismissed_at")
    .eq("user_id", account.id)
    .maybeSingle();

  return NextResponse.json({
    stepsCompleted: completed,
    dismissed: Boolean(progress?.dismissed_at),
    completed: completed.length >= 6,
  });
}

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { dismiss } = (await request.json().catch(() => ({}))) as { dismiss?: boolean };

  await createServiceClient()
    .from("onboarding_progress")
    .upsert(
      {
        user_id: account.id,
        dismissed_at: dismiss ? new Date().toISOString() : null,
      },
      { onConflict: "user_id" }
    );

  return NextResponse.json({ success: true });
}
