import { NextResponse } from "next/server";

import { seedTemplates } from "@/lib/messaging/scheduler";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

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
  const { templateId, subject, body, isActive } = (await request.json()) as {
    templateId?: string;
    subject?: string | null;
    body?: string;
    isActive?: boolean;
  };

  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Update-by-templateId-alone has no webinar in the request to check
  // ownership against — resolve it from the template row itself first.
  const { data: template } = await supabase
    .from("message_templates")
    .select("webinar_id")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });

  const access = await requireWebinarAccess(template.webinar_id);
  if (!access.ok) return access.response;

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
