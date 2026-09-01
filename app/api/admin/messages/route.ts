import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Initial load for the admin feed. Realtime carries everything after this.
export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const sessionId = params.get("sessionId");
  const filter = params.get("filter") ?? "all";
  const search = params.get("search")?.trim();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  let query = supabase
    .from("live_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("sent_at", { ascending: true })
    .limit(500);

  if (filter === "real") {
    query = query.eq("is_real_user", true);
  } else if (filter === "unanswered") {
    query = query.eq("is_real_user", true).eq("has_ai_reply", false);
  }

  if (search) {
    query = query.ilike("sender_name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}
