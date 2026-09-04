import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";
import type { EnterpriseAccountRow } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({
  customMaxMembers: z.number().int().min(1).optional(),
  customMaxWebinars: z.number().int().min(0).optional(),
  customMaxAttendeesPerSession: z.number().int().min(1).optional(),
  customPriceMonthly: z.number().min(0).optional(),
  slaResponseHours: z.number().int().min(1).optional(),
  customOnboarding: z.boolean().optional(),
  whiteLabelIncluded: z.boolean().optional(),
  apiRateLimitPerMinute: z.number().int().min(1).optional(),
  contractStartDate: z.string().nullable().optional(),
  contractEndDate: z.string().nullable().optional(),
  accountManagerId: z.string().uuid().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

/**
 * Updates the account's terms.
 *
 * Enterprise billing is manual invoicing, not a Stripe subscription — a
 * custom contract with a custom price does not fit the same self-serve
 * checkout used everywhere else, and enterprise deals are negotiated, not
 * bought off a pricing page.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { response: denied } = await requireCapability("view_revenue");
  if (denied) return denied;

  const { accountId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const patch: Partial<EnterpriseAccountRow> = {};
  if (parsed.data.customMaxMembers !== undefined) patch.custom_max_members = parsed.data.customMaxMembers;
  if (parsed.data.customMaxWebinars !== undefined) patch.custom_max_webinars = parsed.data.customMaxWebinars;
  if (parsed.data.customMaxAttendeesPerSession !== undefined) {
    patch.custom_max_attendees_per_session = parsed.data.customMaxAttendeesPerSession;
  }
  if (parsed.data.customPriceMonthly !== undefined) patch.custom_price_monthly = parsed.data.customPriceMonthly;
  if (parsed.data.slaResponseHours !== undefined) patch.sla_response_hours = parsed.data.slaResponseHours;
  if (parsed.data.customOnboarding !== undefined) patch.custom_onboarding = parsed.data.customOnboarding;
  if (parsed.data.whiteLabelIncluded !== undefined) patch.white_label_included = parsed.data.whiteLabelIncluded;
  if (parsed.data.apiRateLimitPerMinute !== undefined) {
    patch.api_rate_limit_per_minute = parsed.data.apiRateLimitPerMinute;
  }
  if (parsed.data.contractStartDate !== undefined) patch.contract_start_date = parsed.data.contractStartDate;
  if (parsed.data.contractEndDate !== undefined) patch.contract_end_date = parsed.data.contractEndDate;
  if (parsed.data.accountManagerId !== undefined) patch.account_manager_id = parsed.data.accountManagerId;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("enterprise_accounts")
    .update(patch)
    .eq("id", accountId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The team's own limits stay in step with what was just granted, since
  // that is what the rest of the product actually reads.
  if (
    (parsed.data.customMaxMembers !== undefined || parsed.data.customMaxWebinars !== undefined) &&
    data.team_id
  ) {
    await supabase
      .from("teams")
      .update({
        ...(parsed.data.customMaxMembers !== undefined
          ? { max_members: parsed.data.customMaxMembers }
          : {}),
        ...(parsed.data.customMaxWebinars !== undefined
          ? { max_webinars: parsed.data.customMaxWebinars }
          : {}),
      })
      .eq("id", data.team_id);
  }

  return NextResponse.json({ account: data });
}
