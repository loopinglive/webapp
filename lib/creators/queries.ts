import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

export type PublicCreatorProfile = {
  id: string;
  user_id: string;
  creator_handle: string;
  full_name: string;
  bio: string | null;
  niche: string | null;
  audience_size_estimate: number | null;
  verified: boolean;
  total_webinars_hosted: number;
  total_attendees_served: number;
  total_revenue_generated: number;
  follower_count: number;
  social_links: Record<string, string>;
};

export async function getPublicCreatorProfile(handle: string): Promise<PublicCreatorProfile | null> {
  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("creator_economy_profiles")
    .select("*")
    .eq("creator_handle", handle.toLowerCase())
    .eq("public_profile_enabled", true)
    .maybeSingle();

  if (!profile || !profile.user_id) return null;

  const { data: account } = await supabase
    .from("user_accounts")
    .select("full_name")
    .eq("id", profile.user_id)
    .maybeSingle();

  return {
    id: profile.id,
    user_id: profile.user_id,
    creator_handle: profile.creator_handle!,
    full_name: account?.full_name ?? profile.creator_handle!,
    bio: profile.bio,
    niche: profile.niche,
    audience_size_estimate: profile.audience_size_estimate,
    verified: profile.verified,
    total_webinars_hosted: profile.total_webinars_hosted,
    total_attendees_served: profile.total_attendees_served,
    total_revenue_generated: profile.total_revenue_generated,
    follower_count: profile.follower_count,
    social_links: (profile.social_links as Record<string, string>) ?? {},
  };
}

export type UpcomingWebinar = { id: string; title: string; description: string | null };

export async function getCreatorUpcomingWebinars(userId: string): Promise<UpcomingWebinar[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("webinars")
    .select("id, title, description")
    .eq("owner_id", userId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(12);

  return data ?? [];
}

export async function isFollowing(followerId: string, creatorId: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("creator_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  return Boolean(data);
}
