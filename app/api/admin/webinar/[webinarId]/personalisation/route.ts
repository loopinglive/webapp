import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWebinarAccess } from "@/lib/webinar-access";

import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const supabase = createServiceClient();

  const { data: rules } = await supabase
    .from("personalisation_rules")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("priority", { ascending: false });

  return NextResponse.json({ rules: rules ?? [] });
}

const conditionSchema = z.object({
  field: z.enum([
    "deviceType",
    "countryCode",
    "returningAttendee",
    "watchPercentage",
    "clickedOffer",
    "utmSource",
  ]),
  operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "contains"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const actionSchema = z.object({
  type: z.enum(["custom_message", "alternate_headline", "tag_segment"]),
  value: z.string().min(1).max(500),
});

const schema = z.object({
  ruleName: z.string().min(1).max(120).trim(),
  conditions: z.array(conditionSchema).max(10),
  actions: z.array(actionSchema).min(1).max(5),
  priority: z.number().int().min(0).max(100).default(0),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rule." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data: rule, error } = await supabase
    .from("personalisation_rules")
    .insert({
      webinar_id: webinarId,
      rule_name: parsed.data.ruleName,
      conditions: parsed.data.conditions as unknown as Json,
      actions: parsed.data.actions as unknown as Json,
      priority: parsed.data.priority,
    })
    .select("*")
    .single();

  if (error || !rule) {
    return NextResponse.json({ error: error?.message ?? "Could not create rule." }, { status: 500 });
  }

  return NextResponse.json({ rule });
}
