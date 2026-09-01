import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdminSessionPayload, AiPersona, PersonaModeMap } from "@/types";

export const dynamic = "force-dynamic";

// Everything the admin panel needs to boot: session, webinar, personas, modes.
export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("webinar_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const [{ data: webinar }, { data: personaRows }, { data: modeRows }] =
    await Promise.all([
      supabase
        .from("webinars")
        .select("id, title, video_duration_seconds")
        .eq("id", session.webinar_id)
        .maybeSingle(),
      supabase
        .from("ai_personas")
        .select("*")
        .eq("webinar_id", session.webinar_id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("persona_mode")
        .select("ai_persona_id, mode")
        .eq("session_id", sessionId),
    ]);

  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  const modes: PersonaModeMap = {};
  for (const row of modeRows ?? []) {
    modes[row.ai_persona_id] = row.mode;
  }
  // A persona with no row yet defaults to AI mode, matching the column default.
  for (const persona of personaRows ?? []) {
    modes[persona.id] ??= "ai";
  }

  const payload: AdminSessionPayload = {
    session,
    webinar,
    personas: (personaRows ?? []) as AiPersona[],
    modes,
  };

  return NextResponse.json(payload);
}

// Admin presence: join on mount, leave on unmount.
export async function POST(request: Request) {
  const { user, response: denied } = await requireAdmin();
  if (denied) return denied;

  const { sessionId, action } = (await request.json()) as {
    sessionId?: string;
    action?: "join" | "leave";
  };

  if (!sessionId || !action) {
    return NextResponse.json(
      { error: "sessionId and action are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  if (action === "join") {
    const { data, error } = await supabase
      .from("admin_sessions")
      .insert({ webinar_session_id: sessionId, admin_id: user.id })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, adminSessionId: data.id });
  }

  await supabase
    .from("admin_sessions")
    .update({ left_at: new Date().toISOString() })
    .eq("webinar_session_id", sessionId)
    .eq("admin_id", user.id)
    .is("left_at", null);

  return NextResponse.json({ success: true });
}
