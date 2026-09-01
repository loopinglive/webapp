import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
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
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const webinarId = params.get("webinarId");

  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

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

  // Segment lives in its own table, so filtering by it means resolving the ids
  // first rather than joining — PostgREST cannot filter a parent by an embedded
  // resource's column.
  let ids: string[] | null = null;
  if (segment && segment !== "all") {
    const segments = segment.split(",");
    const { data: rows } = await supabase
      .from("attendee_segments")
      .select("registrant_id")
      .eq("webinar_id", webinarId)
      .in("segment", segments);
    ids = (rows ?? []).map((row) => row.registrant_id);
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

  // Two wide reads rather than a join per row.
  const [{ data: segmentRows }, { data: sourceRows }] = await Promise.all([
    supabase
      .from("attendee_segments")
      .select("registrant_id, segment")
      .eq("webinar_id", webinarId)
      .in("registrant_id", rowIds.length ? rowIds : ["-"]),
    supabase
      .from("attendee_sources")
      .select("registrant_id, utm_source, utm_campaign")
      .in("registrant_id", rowIds.length ? rowIds : ["-"]),
  ]);

  const segmentBy = new Map(
    (segmentRows ?? []).map((row) => [row.registrant_id, row.segment])
  );
  const sourceBy = new Map(
    (sourceRows ?? []).map((row) => [row.registrant_id, row])
  );

  const attendees: AttendeeListItem[] = rows.map((row) => ({
    ...row,
    segment: segmentBy.get(row.id) ?? "REGISTERED",
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
