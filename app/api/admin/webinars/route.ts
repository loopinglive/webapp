import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Webinar, WebinarSummary } from "@/types";

export const dynamic = "force-dynamic";

// Dashboard list: every webinar with the numbers its card shows.
export async function GET() {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const supabase = createServiceClient();

  const { data: webinars, error } = await supabase
    .from("webinars")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (webinars ?? []).map((webinar) => webinar.id);

  if (!ids.length) {
    return NextResponse.json({ webinars: [], totals: emptyTotals() });
  }

  // Two wide reads beat 2N per-webinar count queries.
  const [{ data: registrants }, { data: sessions }] = await Promise.all([
    supabase
      .from("registrants")
      .select("webinar_id, attended, bought")
      .in("webinar_id", ids),
    supabase
      .from("webinar_sessions")
      .select("webinar_id, starts_at")
      .in("webinar_id", ids)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
  ]);

  const nextSession = new Map<string, string>();
  for (const session of sessions ?? []) {
    if (!nextSession.has(session.webinar_id)) {
      nextSession.set(session.webinar_id, session.starts_at);
    }
  }

  const tally = new Map<string, { registrants: number; attendees: number }>();
  for (const row of registrants ?? []) {
    const current = tally.get(row.webinar_id) ?? { registrants: 0, attendees: 0 };
    current.registrants += 1;
    if (row.attended) current.attendees += 1;
    tally.set(row.webinar_id, current);
  }

  const summaries: WebinarSummary[] = (webinars ?? []).map((webinar) => {
    const counts = tally.get(webinar.id) ?? { registrants: 0, attendees: 0 };
    return {
      ...(webinar as Webinar),
      registrants: counts.registrants,
      attendees: counts.attendees,
      nextSessionAt: nextSession.get(webinar.id) ?? null,
    };
  });

  return NextResponse.json({
    webinars: summaries,
    totals: {
      webinars: summaries.length,
      registrants: summaries.reduce((sum, w) => sum + w.registrants, 0),
      attendees: summaries.reduce((sum, w) => sum + w.attendees, 0),
      buyers: (registrants ?? []).filter((row) => row.bought).length,
    },
  });
}

function emptyTotals() {
  return { webinars: 0, registrants: 0, attendees: 0, buyers: 0 };
}
