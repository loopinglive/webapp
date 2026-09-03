import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Error log, grouped.
 *
 * Grouped by message rather than listed chronologically: one render loop can
 * produce a thousand rows, and a raw list buries the other nine problems
 * underneath it. Count, first seen and last seen is what makes it triageable.
 */
export async function GET(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const days = Math.min(30, Math.max(1, Number(new URL(request.url).searchParams.get("days") ?? 7)));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from("error_logs")
    .select("id, user_id, error_type, error_message, page_url, user_agent, created_at, stack_trace")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Group = {
    key: string;
    errorType: string;
    message: string;
    count: number;
    affectedUsers: Set<string>;
    firstSeen: string;
    lastSeen: string;
    pages: Set<string>;
    sampleStack: string | null;
  };

  const groups = new Map<string, Group>();

  for (const row of rows ?? []) {
    // Trimmed so two occurrences differing only in a trailing id still group.
    const key = `${row.error_type}::${row.error_message.slice(0, 160)}`;
    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
      if (row.user_id) existing.affectedUsers.add(row.user_id);
      if (row.page_url) existing.pages.add(row.page_url);
      if (row.created_at < existing.firstSeen) existing.firstSeen = row.created_at;
      if (row.created_at > existing.lastSeen) existing.lastSeen = row.created_at;
      continue;
    }

    groups.set(key, {
      key,
      errorType: row.error_type,
      message: row.error_message,
      count: 1,
      affectedUsers: new Set(row.user_id ? [row.user_id] : []),
      firstSeen: row.created_at,
      lastSeen: row.created_at,
      pages: new Set(row.page_url ? [row.page_url] : []),
      sampleStack: row.stack_trace,
    });
  }

  const list = [...groups.values()]
    .map((group) => ({
      key: group.key,
      errorType: group.errorType,
      message: group.message,
      count: group.count,
      affectedUsers: group.affectedUsers.size,
      firstSeen: group.firstSeen,
      lastSeen: group.lastSeen,
      pages: [...group.pages].slice(0, 5),
      sampleStack: group.sampleStack?.slice(0, 2000) ?? null,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    groups: list,
    totalEvents: rows?.length ?? 0,
    days,
    // The query is capped, so say when the window is larger than the sample.
    truncated: (rows?.length ?? 0) >= 2000,
  });
}
