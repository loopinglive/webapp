import { apiError, authenticateApiKey } from "@/lib/api/auth";
import { clientIp, LIMITS, rateLimit, rateLimitHeaders, tooManyRequests } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/public/v1/webinars/{id} */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return apiError(auth.status, auth.error);

  const limit = rateLimit(`api:${auth.actor.keyId}:${clientIp(request)}`, LIMITS.publicApi);
  if (!limit.ok) return tooManyRequests(limit);

  const { id } = await params;
  const supabase = createServiceClient();

  // Ownership is part of the query, not a check afterwards -- a webinar
  // belonging to someone else is indistinguishable from one that does not exist.
  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, description, status, video_url, video_duration_seconds, thumbnail_url, created_at, updated_at")
    .eq("id", id)
    .eq("owner_id", auth.actor.userId)
    .maybeSingle();

  if (!webinar) return apiError(404, "No such webinar.");

  const [{ count: registrantCount }, { data: sessions }] = await Promise.all([
    supabase
      .from("registrants")
      .select("id", { count: "exact", head: true })
      .eq("webinar_id", id),
    supabase
      .from("webinar_sessions")
      .select("id, starts_at, ends_at, status")
      .eq("webinar_id", id)
      .order("starts_at", { ascending: false })
      .limit(25),
  ]);

  return Response.json(
    { webinar: { ...webinar, registrantCount: registrantCount ?? 0, sessions: sessions ?? [] } },
    { headers: rateLimitHeaders(limit) }
  );
}
