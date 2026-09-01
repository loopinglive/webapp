import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { MessageChannel, MessageStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const webinarId = params.get("webinarId");
  const channel = params.get("channel");
  const status = params.get("status");
  const search = params.get("search")?.trim();
  const page = Math.max(1, Number(params.get("page") ?? 1));

  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  let query = supabase
    .from("scheduled_messages")
    .select("*", { count: "exact" })
    .eq("webinar_id", webinarId);

  if (channel && channel !== "all") query = query.eq("channel", channel as MessageChannel);
  if (status && status !== "all") {
    query =
      status === "failed"
        ? query.in("status", ["failed", "failed_permanently"])
        : query.eq("status", status as MessageStatus);
  }
  if (search) {
    query = query.or(
      `recipient_name.ilike.%${search}%,recipient_email.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query
    .order("scheduled_for", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Counts for the stats bar, over the whole webinar rather than this page.
  const { data: all } = await supabase
    .from("scheduled_messages")
    .select("status, channel")
    .eq("webinar_id", webinarId);

  const stats = {
    total: all?.length ?? 0,
    sent: 0,
    pending: 0,
    failed: 0,
    cancelled: 0,
    email: 0,
    sms: 0,
    whatsapp: 0,
  };

  for (const row of all ?? []) {
    if (row.status === "sent") stats.sent += 1;
    else if (row.status === "pending") stats.pending += 1;
    else if (row.status === "cancelled") stats.cancelled += 1;
    else stats.failed += 1;

    if (row.channel in stats) {
      stats[row.channel as "email" | "sms" | "whatsapp"] += 1;
    }
  }

  return NextResponse.json({
    logs: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    stats,
  });
}

/** Retry a failed message now. */
export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { messageId } = (await request.json()) as { messageId?: string };
  if (!messageId) {
    return NextResponse.json({ error: "messageId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Reset the attempt counter so a manual retry gets a full run of chances.
  const { error } = await supabase
    .from("scheduled_messages")
    .update({
      status: "pending" as MessageStatus,
      attempts: 0,
      error_message: null,
      scheduled_for: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { dispatchMessage } = await import("@/lib/messaging/dispatch");
  const outcome = await dispatchMessage(supabase, messageId);

  return NextResponse.json({ success: true, outcome });
}
