import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWebinarAccess } from "@/lib/webinar-access";

import { findMatchingRule, type Condition, type PersonalisationAction } from "@/lib/intelligence/personalisation";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  deviceType: z.string().nullable(),
  countryCode: z.string().nullable(),
  returningAttendee: z.boolean(),
  watchPercentage: z.number(),
  clickedOffer: z.boolean(),
  utmSource: z.string().nullable(),
});

/** Tests a hand-built sample context against a webinar's active rules, without touching a real registrant. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sample context." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data: rules } = await supabase
    .from("personalisation_rules")
    .select("id, rule_name, conditions, actions, priority")
    .eq("webinar_id", webinarId)
    .eq("is_active", true);

  const candidates = (rules ?? []).map((rule) => ({
    id: rule.id,
    conditions: (rule.conditions as unknown as Condition[]) ?? [],
    actions: (rule.actions as unknown as PersonalisationAction[]) ?? [],
    priority: rule.priority,
  }));

  const matched = findMatchingRule(candidates, parsed.data);
  const source = rules?.find((rule) => rule.id === matched?.id);

  return NextResponse.json({
    matched: matched
      ? { ruleId: matched.id, ruleName: source?.rule_name ?? "", actions: matched.actions }
      : null,
  });
}
