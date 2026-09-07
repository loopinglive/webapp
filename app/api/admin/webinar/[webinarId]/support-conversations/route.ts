import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  // support_conversations has no webinar_id column -- registrants do, so the
  // join goes through them rather than duplicating the webinar on every row.
  const { data: registrants } = await supabase
    .from("registrants")
    .select("id, full_name, email")
    .eq("webinar_id", webinarId);

  const registrantIds = (registrants ?? []).map((r) => r.id);
  if (registrantIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const { data: conversations } = await supabase
    .from("support_conversations")
    .select("*")
    .in("registrant_id", registrantIds)
    .order("updated_at", { ascending: false })
    .limit(200);

  const byId = new Map((registrants ?? []).map((r) => [r.id, r]));

  return NextResponse.json({
    conversations: (conversations ?? []).map((conversation) => ({
      ...conversation,
      registrant: byId.get(conversation.registrant_id) ?? null,
    })),
  });
}
