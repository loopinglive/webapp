import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SORTS = ["followers", "webinars", "newest"] as const;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const niche = params.get("niche");
  const search = params.get("search")?.trim();
  const requestedSort = params.get("sort");
  const sort = SORTS.includes(requestedSort as (typeof SORTS)[number])
    ? (requestedSort as (typeof SORTS)[number])
    : "followers";
  const featuredOnly = params.get("featured") === "true";

  const supabase = createServiceClient();

  let query = supabase
    .from("creator_economy_profiles")
    .select(
      "id, user_id, creator_handle, bio, niche, verified, featured, total_webinars_hosted, total_attendees_served, follower_count, social_links"
    )
    .eq("public_profile_enabled", true)
    .not("creator_handle", "is", null);

  if (niche) query = query.eq("niche", niche);
  if (featuredOnly) query = query.eq("featured", true);
  if (search) query = query.ilike("creator_handle", `%${search}%`);

  if (sort === "followers") query = query.order("follower_count", { ascending: false });
  else if (sort === "webinars") query = query.order("total_webinars_hosted", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data: profiles, error } = await query.limit(60);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (profiles ?? []).map((profile) => profile.user_id).filter(Boolean) as string[];
  const { data: accounts } = userIds.length
    ? await supabase.from("user_accounts").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameById = new Map((accounts ?? []).map((account) => [account.id, account.full_name]));

  return NextResponse.json({
    creators: (profiles ?? []).map((profile) => ({
      ...profile,
      full_name: nameById.get(profile.user_id ?? "") ?? profile.creator_handle,
    })),
  });
}
