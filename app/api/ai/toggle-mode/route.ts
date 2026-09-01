import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { sessionId, personaId, newMode } = (await request.json()) as {
    sessionId?: string;
    personaId?: string;
    newMode?: "ai" | "human";
  };

  if (!sessionId || !personaId || (newMode !== "ai" && newMode !== "human")) {
    return NextResponse.json(
      { error: "sessionId, personaId and newMode are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("persona_mode").upsert(
    {
      session_id: sessionId,
      ai_persona_id: personaId,
      mode: newMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,ai_persona_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Coming back to AI mode, anything left unanswered while the admin held the
  // persona is fair game again — the reply queue picks it up on its next sweep.
  return NextResponse.json({ success: true, mode: newMode });
}
