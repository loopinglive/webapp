import { NextResponse } from "next/server";

import { deriveSegments } from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";
import type { AttendeeListItem } from "@/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const SORTABLE = new Set([
  "full_name",
  "email",
  "created_at",
  "last_attended_at",
  "watch_percentage",
  "clicked_offer",
  "bought",
]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const webinarId = params.get("webinarId");

  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const segment = params.get("segment");
  const search = params.get("search")?.trim();
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const sortBy = SORTABLE.has(params.get("sortBy") ?? "")
    ? params.get("sortBy")!
    : "created_at";
  const ascending = params.get("sortOrder") === "asc";

  const supabase = createServiceClient();

  // Derived once and used for both the filter and each row's badge. Reading
  // attendee_segments for either meant a webinar whose rows were never
  // processed filtered to nobody and displayed everyone as "Registered" —
  // including, visibly, people the stat tiles had just counted as no-shows.
  const derived = await deriveSegments(supabase, webinarId);

  // Filtering resolves ids first: PostgREST cannot filter a parent by an
  // embedded resource's column.
  let ids: string[] | null = null;
  if (segment && segment !== "all") {
    const wanted = new Set(segment.split(","));
    ids = [...derived.entries()].filter(([, value]) => wanted.has(value)).map(([id]) => id);
    if (!ids.length) {
      return NextResponse.json({ attendees: [], total: 0, page, totalPages: 0 });
    }
  }

  let query = supabase
    .from("registrants")
    .select("*", { count: "exact" })
    .eq("webinar_id", webinarId);

  if (ids) query = query.in("id", ids);
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data, count, error } = await query
    .order(sortBy, { ascending, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const rowIds = rows.map((row) => row.id);

  const { data: sourceRows } = await supabase
    .from("attendee_sources")
    .select("registrant_id, utm_source, utm_campaign")
    .in("registrant_id", rowIds.length ? rowIds : ["-"]);

  const sourceBy = new Map(
    (sourceRows ?? []).map((row) => [row.registrant_id, row])
  );

  const attendees: AttendeeListItem[] = rows.map((row) => ({
    ...row,
    segment: derived.get(row.id) ?? "REGISTERED",
    // last_attended_at is only written by the live attendance route. Rows that
    // recorded attendance another way still have the older joined_at, and
    // showing "Never" beside a row the tiles counted as watched is the page
    // contradicting itself.
    last_attended_at: row.last_attended_at ?? row.joined_at ?? null,
    utm_source: sourceBy.get(row.id)?.utm_source ?? null,
    utm_campaign: sourceBy.get(row.id)?.utm_campaign ?? null,
  }));

  return NextResponse.json({
    attendees,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  });
}
