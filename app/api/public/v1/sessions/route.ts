import { apiError, authenticateApiKey, pagination } from "@/lib/api/auth";
import { clientIp, LIMITS, rateLimit, rateLimitHeaders, tooManyRequests } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return apiError(auth.status, auth.error);

  const limit = rateLimit(`api:${auth.actor.keyId}:${clientIp(request)}`, LIMITS.publicApi);
  if (!limit.ok) return tooManyRequests(limit);

  const supabase = createServiceClient();

  // Scoped by ownership through the webinar list rather than trusting a
  // webinar_id parameter on its own.
  const { data: owned } = await supabase
    .from("webinars")
    .select("id")
    .eq("owner_id", auth.actor.userId);

  const ids = (owned ?? []).map((row) => row.id);
  if (ids.length === 0) {
    return Response.json(
      { sessions: [], total: 0, page: 1, limit: 25 },
      { headers: rateLimitHeaders(limit) }
    );
  }

  const url = new URL(request.url);
  const { page, limit: perPage, from, to } = pagination(url);

  let query = supabase
    .from("webinar_sessions")
    .select("id, webinar_id, starts_at, ends_at, status, created_at", { count: "exact" })
    .in("webinar_id", ids)
    .order("starts_at", { ascending: false })
    .range(from, to);

  const webinarId = url.searchParams.get("webinar_id");
  if (webinarId && ids.includes(webinarId)) query = query.eq("webinar_id", webinarId);

  const status = url.searchParams.get("status");
  if (status === "scheduled" || status === "live" || status === "ended") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;
  if (error) return apiError(500, error.message);

  return Response.json(
    { sessions: data ?? [], total: count ?? 0, page, limit: perPage },
    { headers: rateLimitHeaders(limit) }
  );
}
