import { z } from "zod";

import { apiError, authenticateApiKey, pagination } from "@/lib/api/auth";
import { clientIp, LIMITS, rateLimit, rateLimitHeaders, tooManyRequests } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  full_name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  phone: z.string().min(5).max(20).regex(/^[0-9+\-\s()]+$/).optional(),
  country_code: z.string().length(2).optional(),
  session_id: z.string().uuid().optional(),
});

/** Confirms the webinar belongs to the key's owner. */
async function ownedWebinar(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
  userId: string
) {
  const { data } = await supabase
    .from("webinars")
    .select("id, title")
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();
  return data;
}

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

  if (!(await ownedWebinar(supabase, id, auth.actor.userId))) {
    return apiError(404, "No such webinar.");
  }

  const url = new URL(request.url);
  const { page, limit: perPage, from, to } = pagination(url);

  let query = supabase
    .from("registrants")
    .select(
      "id, full_name, email, phone, country_code, attended, watch_percentage, watch_seconds, clicked_offer, bought, watch_depth_segment, created_at",
      { count: "exact" }
    )
    .eq("webinar_id", id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const segment = url.searchParams.get("segment");
  if (segment) query = query.eq("watch_depth_segment", segment);
  if (url.searchParams.get("boughtOnly") === "true") query = query.eq("bought", true);

  const { data, count, error } = await query;
  if (error) return apiError(500, error.message);

  return Response.json(
    { registrants: data ?? [], total: count ?? 0, page, limit: perPage },
    { headers: rateLimitHeaders(limit) }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return apiError(auth.status, auth.error);

  const limit = rateLimit(`api:${auth.actor.keyId}:${clientIp(request)}`, LIMITS.publicApi);
  if (!limit.ok) return tooManyRequests(limit);

  const { id } = await params;
  const supabase = createServiceClient();

  const webinar = await ownedWebinar(supabase, id, auth.actor.userId);
  if (!webinar) return apiError(404, "No such webinar.");

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return apiError(422, "Validation failed.", { issues: parsed.error.issues });
  }

  // Falls back to the next scheduled session, so a caller does not have to
  // look one up just to register somebody.
  let sessionId = parsed.data.session_id ?? null;
  if (!sessionId) {
    const { data: session } = await supabase
      .from("webinar_sessions")
      .select("id")
      .eq("webinar_id", id)
      .eq("status", "scheduled")
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    sessionId = session?.id ?? null;
  }

  const { data, error } = await supabase
    .from("registrants")
    .insert({
      webinar_id: id,
      session_id: sessionId,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? "",
      country_code: parsed.data.country_code ?? "",
      country_flag: "",
    })
    .select("id, full_name, email, session_id, created_at")
    .single();

  if (error) return apiError(500, error.message);

  return Response.json({ registrant: data }, { status: 201, headers: rateLimitHeaders(limit) });
}
