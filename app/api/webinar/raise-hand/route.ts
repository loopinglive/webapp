import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAnyAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Admin only: the live queue of hands still up, oldest first. */
export async function GET(request: Request) {
  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 });

  const { data, error } = await createServiceClient()
    .from("raised_hands")
    .select("id, registrant_id, raised_at, acknowledged_at, registrants(full_name, email)")
    .eq("session_id", sessionId)
    .is("lowered_at", null)
    .order("raised_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const queue = (data ?? []).map((row) => {
    const registrant = Array.isArray(row.registrants) ? row.registrants[0] : row.registrants;
    return {
      id: row.id,
      registrantId: row.registrant_id,
      name: registrant?.full_name ?? registrant?.email ?? "Attendee",
      raisedAt: row.raised_at,
      acknowledged: !!row.acknowledged_at,
    };
  });

  return NextResponse.json({ queue });
}

const postSchema = z.object({
  sessionId: z.string().uuid(),
  registrantId: z.string().uuid(),
  action: z.enum(["raise", "lower"]),
});

/** Public: an attendee raising or lowering their own hand. */
export async function POST(request: Request) {
  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { sessionId, registrantId, action } = parsed.data;

  if (action === "raise") {
    const { error } = await supabase
      .from("raised_hands")
      .upsert(
        { session_id: sessionId, registrant_id: registrantId, raised_at: new Date().toISOString(), lowered_at: null, acknowledged_at: null },
        { onConflict: "session_id,registrant_id" }
      );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("raised_hands")
      .update({ lowered_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("registrant_id", registrantId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Admin only: acknowledge a raised hand (keeps it visible but marked seen). */
export async function PATCH(request: Request) {
  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const parsed = z
    .object({ sessionId: z.string().uuid(), registrantId: z.string().uuid() })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const { error } = await createServiceClient()
    .from("raised_hands")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("session_id", parsed.data.sessionId)
    .eq("registrant_id", parsed.data.registrantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
