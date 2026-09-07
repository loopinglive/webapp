import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}

/** Rule: a creator with zero published webinars cannot have a public profile enabled. */
export async function hasPublishedWebinar(userId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("webinars")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .eq("status", "published");

  return (count ?? 0) > 0;
}

/** Recomputes the denormalised stat counters shown on a public profile. */
export async function refreshCreatorStats(profileId: string, userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: webinars } = await supabase
    .from("webinars")
    .select("id")
    .eq("owner_id", userId)
    .eq("status", "published");

  const webinarIds = (webinars ?? []).map((webinar) => webinar.id);

  const [{ count: attendeeCount }, { count: followerCount }, revenueResult] = await Promise.all([
    webinarIds.length
      ? supabase
          .from("registrants")
          .select("id", { count: "exact", head: true })
          .in("webinar_id", webinarIds)
          .eq("attended", true)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("creator_follows")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", profileId),
    webinarIds.length
      ? supabase.from("purchases").select("amount_cents").in("webinar_id", webinarIds)
      : Promise.resolve({ data: [] as { amount_cents: number }[] }),
  ]);

  const totalRevenue =
    ((revenueResult as { data: { amount_cents: number }[] | null }).data ?? []).reduce(
      (sum, purchase) => sum + (purchase.amount_cents ?? 0),
      0
    ) / 100;

  await supabase
    .from("creator_economy_profiles")
    .update({
      total_webinars_hosted: webinarIds.length,
      total_attendees_served: attendeeCount ?? 0,
      total_revenue_generated: totalRevenue,
      follower_count: followerCount ?? 0,
    })
    .eq("id", profileId);
}
