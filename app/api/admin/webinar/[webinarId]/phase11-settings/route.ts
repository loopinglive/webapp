import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  on_demand_enabled: z.boolean().optional(),
  on_demand_expires_hours: z.number().int().min(0).max(8760).optional(),
  on_demand_allow_seek: z.boolean().optional(),
  certificate_enabled: z.boolean().optional(),
  certificate_min_watch_percentage: z.number().min(0).max(100).optional(),
  exit_survey_enabled: z.boolean().optional(),
  private_messaging_enabled: z.boolean().optional(),
  raise_hand_enabled: z.boolean().optional(),
  primary_language: z.string().min(2).max(10).optional(),
});

const COLUMNS =
  "id, on_demand_enabled, on_demand_expires_hours, on_demand_allow_seek, certificate_enabled, certificate_min_watch_percentage, certificate_template_id, exit_survey_enabled, private_messaging_enabled, raise_hand_enabled, primary_language, supported_languages, series_id";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const { data } = await createServiceClient()
    .from("webinars")
    .select(COLUMNS)
    .eq("id", webinarId)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ webinar: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  // Turning certificates on needs a template to render — the admin's default
  // is attached automatically rather than leaving the field empty.
  const service = createServiceClient();
  let templatePatch: { certificate_template_id?: string } = {};

  if (parsed.data.certificate_enabled) {
    const { data: webinar } = await service
      .from("webinars")
      .select("certificate_template_id, owner_id")
      .eq("id", webinarId)
      .maybeSingle();

    if (webinar?.owner_id && !webinar.certificate_template_id) {
      const { data: template } = await service
        .from("certificate_templates")
        .select("id")
        .eq("user_id", webinar.owner_id)
        .eq("is_default", true)
        .maybeSingle();
      if (template) templatePatch = { certificate_template_id: template.id };
    }
  }

  const { error } = await service
    .from("webinars")
    .update({ ...parsed.data, ...templatePatch })
    .eq("id", webinarId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
