import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Health check for uptime monitoring.
 *
 * Touches the database, because a deployment that serves HTML but cannot
 * reach Postgres is down in every way that matters to a customer. Returns 503
 * on failure so a monitor treats it as an outage rather than a slow success.
 */
export async function GET() {
  const startedAt = Date.now();

  let database: "ok" | "unreachable" = "unreachable";
  try {
    // Cheapest possible round trip: count with head, no rows returned.
    const { error } = await createServiceClient()
      .from("plans")
      .select("slug", { count: "exact", head: true });
    if (!error) database = "ok";
  } catch {
    database = "unreachable";
  }

  const healthy = database === "ok";

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      database,
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
