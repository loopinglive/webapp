import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Regulated markets, and which registrants are actually in them.
 *
 * Not a compliance engine — the disclosure panel is explicit that this is not
 * legal advice, and nothing here claims to know what any regulator requires.
 * What it can do honestly is answer a question the host cannot currently see
 * the answer to: are they actually selling into a market where this question
 * comes up at all? The geo data is already captured on every registrant; this
 * is the first thing that reads it back for this purpose.
 */
const REGULATED = new Set([
  "US", "GB", "UK", "CA", "AU",
  // The EU/EEA, where a webinar sold cross-border falls under UCPD.
  "DE", "FR", "IT", "ES", "NL", "BE", "SE", "IE", "PT", "AT", "DK",
  "FI", "PL", "GR", "CZ", "RO", "HU", "SK", "BG", "HR", "SI", "LT",
  "LV", "EE", "LU", "MT", "CY",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("registrants")
    .select("ip_country")
    .eq("webinar_id", webinarId)
    .eq("is_test", false)
    .not("ip_country", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.ip_country) continue;
    counts.set(row.ip_country, (counts.get(row.ip_country) ?? 0) + 1);
  }

  const total = rows.length;
  const regulatedCount = [...counts.entries()]
    .filter(([country]) => REGULATED.has(country))
    .reduce((sum, [, count]) => sum + count, 0);

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({
      country,
      count,
      regulated: REGULATED.has(country),
    }));

  return NextResponse.json({
    total,
    regulatedCount,
    // Only a signal once there is enough data for a percentage to mean
    // anything — five registrants is not an audience, it is a rounding error.
    regulatedShare: total >= 5 ? regulatedCount / total : null,
    top,
  });
}
