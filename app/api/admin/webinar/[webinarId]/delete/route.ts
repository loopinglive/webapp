import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { confirmTitle } = (await request.json()) as { confirmTitle?: string };

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  // Deleting cascades to sessions, personas, comments, registrants and chat.
  // Typing the title is the only thing standing between a click and all of it.
  if (confirmTitle?.trim() !== webinar.title) {
    return NextResponse.json(
      { error: "Type the webinar title exactly to confirm deletion." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("webinars").delete().eq("id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
