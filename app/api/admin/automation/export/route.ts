import { requireAdmin } from "@/lib/admin-auth";
import { TEMPLATE_BY_KEY } from "@/lib/messaging/defaults";
import { createServiceClient } from "@/lib/supabase/server";
import type { MessageChannel, MessageStatus } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COLUMNS = [
  "Recipient",
  "Email",
  "Phone",
  "Channel",
  "Message",
  "Template Key",
  "Status",
  "Attempts",
  "Scheduled For",
  "Sent At",
  "Error",
  "Provider Message ID",
];

/** RFC 4180 quoting, plus a guard against spreadsheet formula injection. */
function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const webinarId = params.get("webinarId");
  const channel = params.get("channel");
  const status = params.get("status");

  if (!webinarId) {
    return Response.json({ error: "webinarId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title")
    .eq("id", webinarId)
    .maybeSingle();

  let query = supabase
    .from("scheduled_messages")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("scheduled_for", { ascending: false });

  if (channel && channel !== "all") {
    query = query.eq("channel", channel as MessageChannel);
  }
  if (status && status !== "all") {
    query =
      status === "failed"
        ? query.in("status", ["failed", "failed_permanently"])
        : query.eq("status", status as MessageStatus);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const lines = [COLUMNS.map(cell).join(",")];

  for (const row of data ?? []) {
    lines.push(
      [
        row.recipient_name,
        row.recipient_email,
        row.recipient_phone,
        row.channel,
        TEMPLATE_BY_KEY.get(row.template_key ?? "")?.label ?? row.template_key,
        row.template_key,
        row.status,
        row.attempts,
        row.scheduled_for,
        row.sent_at,
        row.error_message,
        row.provider_message_id,
      ]
        .map(cell)
        .join(",")
    );
  }

  const slug = (webinar?.title ?? "webinar")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = new Date().toISOString().slice(0, 10);

  // BOM so Excel does not mangle emoji or accented names.
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="loopinglive-messages-${slug}-${date}.csv"`,
    },
  });
}
