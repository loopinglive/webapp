import { deriveSegments } from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COLUMNS = [
  "Full Name",
  "Email",
  "Phone",
  "Country",
  "Registered At",
  "Attended",
  "First Attended At",
  "Last Attended At",
  "Sessions Attended",
  "Watch Percentage",
  "Watch Depth Segment",
  "Offer Clicked",
  "Offer Clicked At",
  "Bought",
  "Bought At",
  "Manually Marked Bought",
  "Returning Attendee",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "Referrer",
  "Tags",
  "Registrant Notes",
];

/** RFC 4180 quoting, plus a guard against spreadsheet formula injection. */
function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // A field starting with =, +, - or @ is executed as a formula by Excel and
  // Sheets. Attendee names and notes are user input, so prefix them out of it.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const webinarId = params.get("webinarId");
  const segment = params.get("segment");

  if (!webinarId) {
    return Response.json({ error: "webinarId is required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title")
    .eq("id", webinarId)
    .maybeSingle();

  // Derived, not read from attendee_segments — see lib/attendee-tracking.ts.
  // A CSV built from that cache exported everyone as "REGISTERED".
  const derived = await deriveSegments(supabase, webinarId);

  let ids: string[] | null = null;
  if (segment && segment !== "all") {
    const wanted = new Set(segment.split(","));
    ids = [...derived.entries()].filter(([, v]) => wanted.has(v)).map(([id]) => id);
  }

  let query = supabase
    .from("registrants")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false });

  if (ids) {
    if (!ids.length) return csv([COLUMNS.map(cell).join(",")], webinar?.title);
    query = query.in("id", ids);
  }

  const { data: registrants, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rowIds = (registrants ?? []).map((row) => row.id);
  const { data: sources } = await supabase
    .from("attendee_sources")
    .select("*")
    .in("registrant_id", rowIds.length ? rowIds : ["-"]);

  const sourceBy = new Map((sources ?? []).map((row) => [row.registrant_id, row]));
  const segmentBy = derived;

  const lines = [COLUMNS.map(cell).join(",")];

  for (const person of registrants ?? []) {
    const source = sourceBy.get(person.id);
    const tags = Array.isArray(person.tags) ? person.tags.join("; ") : "";

    lines.push(
      [
        person.full_name,
        person.email,
        person.phone,
        person.country_code,
        person.created_at,
        person.attended ? "Yes" : "No",
        person.joined_at,
        person.last_attended_at,
        person.total_sessions_attended,
        person.watch_percentage,
        segmentBy.get(person.id) ?? person.watch_depth_segment,
        person.clicked_offer ? "Yes" : "No",
        person.offer_clicked_at,
        person.bought ? "Yes" : "No",
        person.bought_at,
        person.manually_marked_bought ? "Yes" : "No",
        person.returning_attendee ? "Yes" : "No",
        source?.utm_source,
        source?.utm_medium,
        source?.utm_campaign,
        source?.referrer_url,
        tags,
        person.notes,
      ]
        .map(cell)
        .join(",")
    );
  }

  return csv(lines, webinar?.title);
}

function csv(lines: string[], title?: string | null) {
  const slug = (title ?? "webinar")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = new Date().toISOString().slice(0, 10);

  // The BOM keeps Excel from mangling the flag emoji and accented names.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="loopinglive-attendees-${slug}-${date}.csv"`,
    },
  });
}
