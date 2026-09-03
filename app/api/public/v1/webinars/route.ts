import { apiError, authenticateApiKey, pagination } from "@/lib/api/auth";
import { clientIp, LIMITS, rateLimit, rateLimitHeaders, tooManyRequests } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/public/v1/webinars — the caller's own webinars. */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return apiError(auth.status, auth.error);

  const limit = rateLimit(`api:${auth.actor.keyId}:${clientIp(request)}`, LIMITS.publicApi);
  if (!limit.ok) return tooManyRequests(limit);

  const url = new URL(request.url);
  const { page, limit: perPage, from, to } = pagination(url);
  const status = url.searchParams.get("status") ?? "all";

  const supabase = createServiceClient();
  let query = supabase
    .from("webinars")
    .select(
      "id, title, description, status, video_duration_seconds, thumbnail_url, created_at, updated_at",
      { count: "exact" }
    )
    .eq("owner_id", auth.actor.userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status === "draft" || status === "published") query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return apiError(500, error.message);

  return Response.json(
    { webinars: data ?? [], total: count ?? 0, page, limit: perPage },
    { headers: rateLimitHeaders(limit) }
  );
}
