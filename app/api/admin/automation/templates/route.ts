import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { seedTemplates } from "@/lib/messaging/scheduler";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // A webinar created before Phase 5, or one whose seed never ran, gets its
  // templates on first visit rather than staying mysteriously empty.
  await seedTemplates(supabase, webinarId);

  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("template_key", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { templateId, subject, body, isActive } = (await request.json()) as {
    templateId?: string;
    subject?: string | null;
    body?: string;
    isActive?: boolean;
  };

  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (subject !== undefined) patch.subject = subject;
  if (typeof body === "string") {
    if (!body.trim()) {
      return NextResponse.json(
        { error: "A message cannot be empty." },
        { status: 400 }
      );
    }
    patch.body = body;
  }
  if (typeof isActive === "boolean") patch.is_active = isActive;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("message_templates")
    .update(patch as never)
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, template: data });
}
