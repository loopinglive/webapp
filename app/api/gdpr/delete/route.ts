import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({ confirm: z.literal(true) });

/**
 * Right to erasure, for the account holder's own account.
 *
 * This records the request rather than executing it. A host's account is not
 * one row — it is every webinar they run, their team, their Stripe
 * subscription, and every attendee those webinars hold. Cascading all of that
 * safely (cancelling billing, reassigning or removing team ownership, deciding
 * what survives for the 7-year invoice retention Loopinglive's own privacy
 * policy commits to) is a deliberate, reviewed action, not something to run
 * synchronously off a DELETE request. The 30-day GDPR deadline is a ceiling,
 * not a requirement to act immediately.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Deletion has to be confirmed explicitly." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("data_export_requests")
    .select("id")
    .eq("user_id", account.id)
    .eq("request_type", "deletion")
    .is("completed_at", null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "A deletion request is already pending for this account." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("data_export_requests")
    .insert({ user_id: account.id, request_type: "deletion", status: "pending" })
    .select("id, requested_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    action: "gdpr.deletion_requested",
    resourceType: "user_account",
    resourceId: account.id,
    userId: account.id,
    request,
  });

  return NextResponse.json({
    requestId: data.id,
    requestedAt: data.requested_at,
    message: "Your deletion request has been received. It will be processed within 30 days.",
  });
}
