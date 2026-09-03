import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Registrants of this webinar that reach the same inbox.
 *
 * Reported, not merged. Merging means choosing which watch history and which
 * purchase flag survive, and a host who finds that decision was made for them
 * has lost data they cannot get back. New duplicates are prevented at
 * registration; these are the ones that predate that.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("duplicate_registrants", {
    p_webinar_id: webinarId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const groups = data ?? [];
  if (groups.length === 0) {
    return NextResponse.json({ groups: [], extraCount: 0 });
  }

  // The names and addresses as typed, so a host can see which is which — the
  // canonical form is a matching key and means nothing to them.
  const ids = groups.flatMap((group) => group.ids);
  const { data: people } = await supabase
    .from("registrants")
    .select("id, full_name, email, attended, bought, watch_seconds, created_at")
    .in("id", ids);

  const byId = new Map((people ?? []).map((person) => [person.id, person]));

  return NextResponse.json({
    groups: groups.map((group) => ({
      key: group.email_canonical,
      copies: group.copies,
      registrants: group.ids.map((id) => byId.get(id)).filter(Boolean),
    })),
    // How many registrations the count is inflated by, which is the number a
    // host actually wants: one of each group is a real person.
    extraCount: groups.reduce((sum, group) => sum + group.copies - 1, 0),
  });
}
