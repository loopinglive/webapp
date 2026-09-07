import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { HEALTH_METRICS } from "@/lib/intelligence/platform-health";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The last 7 days of recorded snapshots per tracked metric, for a trend view the live health page doesn't have. */
export async function GET() {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createServiceClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data: rows } = await supabase
    .from("platform_health_metrics")
    .select("*")
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true });

  const byMetric = HEALTH_METRICS.map((metric) => ({
    definition: metric,
    points: (rows ?? []).filter((row) => row.metric_name === metric.name),
  }));

  return NextResponse.json({ metrics: byMetric });
}
