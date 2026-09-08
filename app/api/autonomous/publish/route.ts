import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { planPermissions } from "@/lib/billing/plans";
import { getWebinarSetup, isPublishable, missingSteps } from "@/lib/admin-setup";
import { notifyFollowersOfNewWebinar } from "@/lib/creators/notify";
import { requireWebinarAccess } from "@/lib/webinar-access";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Publishing an autonomously generated webinar goes through the exact same
 * gates as publishing a manually built one (plan permission, setup
 * checklist) — the only thing specific to this pipeline is refusing to
 * publish a job that isn't actually finished yet, and stamping
 * autonomous_webinars.published_at once it goes live.
 */
export async function POST(request: Request) {
  const { webinarId } = (await request.json().catch(() => ({}))) as { webinarId?: string };
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data: job } = await supabase
    .from("autonomous_webinars")
    .select("id, generation_status")
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "No generation job for this webinar." }, { status: 404 });
  if (job.generation_status !== "ready") {
    return NextResponse.json({ error: "This webinar is still generating — nothing to review yet." }, { status: 400 });
  }

  const permissions = planPermissions(await getUserAccount());
  if (!permissions.canPublish) {
    return NextResponse.json(
      { error: "Publishing requires a paid plan.", upgradeRequired: true, planSlug: permissions.planSlug },
      { status: 402 }
    );
  }

  const setup = await getWebinarSetup(webinarId);
  if (!setup) return NextResponse.json({ error: "Webinar not found" }, { status: 404 });

  if (!isPublishable(setup.checklist)) {
    return NextResponse.json(
      { error: "Finish setup before publishing.", missing: missingSteps(setup.checklist) },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabase
    .from("webinars")
    .update({ status: "published", is_active: true, updated_at: new Date().toISOString() })
    .eq("id", webinarId)
    .select("owner_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("autonomous_webinars").update({ published_at: new Date().toISOString() }).eq("id", job.id);

  if (updated?.owner_id) void notifyFollowersOfNewWebinar(updated.owner_id, webinarId);

  return NextResponse.json({ status: "published" });
}
