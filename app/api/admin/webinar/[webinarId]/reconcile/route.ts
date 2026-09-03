import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** What disagrees between the attended flag and the event log. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;

  const { data, error } = await createServiceClient().rpc("attendance_mismatches", {
    p_webinar_id: webinarId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mismatches: data ?? [] });
}

/**
 * Repairs them.
 *
 * The log wins on existence, with one exception: a flag with no event behind
 * it has watch seconds and a join time on the row — evidence the person was
 * there — so the event is written rather than the attendance erased.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { user, response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("reconcile_attendance", {
    p_webinar_id: webinarId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (data ?? {}) as Record<string, number>;

  // Worth a record: this rewrites history, even if only to make it consistent.
  await supabase.from("admin_actions").insert({
    admin_id: user.id,
    action: "attendance_reconciled",
    detail: { webinarId, ...result } as never,
  });

  return NextResponse.json({ result });
}
