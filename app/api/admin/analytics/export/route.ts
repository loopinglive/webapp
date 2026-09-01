import { requireAdmin } from "@/lib/admin-auth";
import { resolveRange } from "@/app/api/admin/analytics/webinar/route";
import { getWebinarAnalytics } from "@/lib/analytics/queries";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** RFC 4180 quoting, plus a guard against spreadsheet formula injection. */
function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const row = (values: unknown[]) => values.map(cell).join(",");

/**
 * Exports what is on screen, not the whole database — the range and scope in
 * the request are the same ones driving the dashboard, and they go in the
 * filename so a downloaded file is still identifiable a week later.
 */
export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const webinarId = params.get("webinarId");

  if (!webinarId) {
    return Response.json({ error: "webinarId is required" }, { status: 400 });
  }

  const { from, to } = resolveRange(params);
  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title")
    .eq("id", webinarId)
    .maybeSingle();

  const a = await getWebinarAnalytics(supabase, webinarId, from, to);

  const lines: string[] = [];

  lines.push(row(["Loopinglive analytics"]));
  lines.push(row(["Webinar", webinar?.title ?? webinarId]));
  lines.push(row(["Range", from.toISOString(), to.toISOString()]));
  lines.push("");

  lines.push(row(["Summary"]));
  lines.push(row(["Metric", "Value"]));
  lines.push(row(["Registrations", a.tiles.registrations]));
  lines.push(row(["Attendees", a.tiles.attendees]));
  lines.push(row(["No-show rate %", a.tiles.noShowRate]));
  lines.push(row(["Average watch %", a.tiles.avgWatchPercentage]));
  lines.push(row(["Average watch seconds", a.tiles.avgWatchSeconds]));
  lines.push(row(["Offer CTR %", a.tiles.offerCtr]));
  lines.push(row(["Conversion %", a.tiles.conversionRate]));
  lines.push(row(["Revenue", (a.tiles.revenueCents / 100).toFixed(2), a.tiles.currency]));
  lines.push("");

  lines.push(row(["Daily"]));
  lines.push(row(["Day", "Registrations", "Attendees"]));
  for (const d of a.timeline) lines.push(row([d.day, d.registrations, d.attendees]));
  lines.push("");

  lines.push(row(["Watch depth"]));
  lines.push(row(["Percent of video", "Still watching", "Share %"]));
  for (const r of a.retention) lines.push(row([r.percent, r.viewers, r.share]));
  lines.push("");

  lines.push(row(["Funnel"]));
  lines.push(row(["Stage", "People", "% of previous"]));
  for (const f of a.funnel) lines.push(row([f.label, f.value, f.ofPrevious ?? ""]));
  lines.push("");

  for (const [heading, rows] of [
    ["Sources", a.sources],
    ["Devices", a.devices],
    ["Country (geo-IP)", a.countries.ip],
    ["Country (declared on phone)", a.countries.declared],
  ] as const) {
    lines.push(row([heading]));
    lines.push(row(["Label", "Count", "Share %"]));
    for (const b of rows) lines.push(row([b.label, b.value, b.share]));
    lines.push("");
  }

  lines.push(row(["Sessions"]));
  lines.push(
    row(["Starts at", "Registrations", "Attendees", "Attendance %", "Avg watch %", "Conversion %"])
  );
  for (const s of a.sessions) {
    lines.push(
      row([
        s.startsAt,
        s.registrations,
        s.attendees,
        s.attendanceRate,
        s.avgWatchPercentage,
        s.conversionRate,
      ])
    );
  }

  const slug = (webinar?.title ?? "webinar")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const range = params.get("range") ?? "30d";
  const date = new Date().toISOString().slice(0, 10);

  // BOM so Excel does not mangle accented names.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="loopinglive-analytics-${slug}-${range}-${date}.csv"`,
    },
  });
}
