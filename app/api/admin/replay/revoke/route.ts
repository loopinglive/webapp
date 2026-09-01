import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Closes replay access early.
 *
 * Deactivates rather than deletes, so the watch data those rows hold stays in
 * the analytics rather than vanishing when a host closes a replay window.
 */
export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { sessionId, registrantId } = (await request.json()) as {
    sessionId?: string;
    registrantId?: string;
  };

  if (!sessionId && !registrantId) {
    return NextResponse.json(
      { error: "Pass a sessionId or a registrantId" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  let query = supabase
    .from("replay_access")
    .update({ is_active: false })
    .eq("is_active", true);

  if (sessionId) query = query.eq("session_id", sessionId);
  if (registrantId) query = query.eq("registrant_id", registrantId);

  const { data, error } = await query.select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, revoked: data?.length ?? 0 });
}
