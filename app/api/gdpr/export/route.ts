import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Right to access / portability, for the account holder themselves.
 *
 * Not the same request as a registrant's — a host's own personal data is
 * their profile, billing, and the configuration they created, not the
 * attendee data their webinars hold (that is covered by the registrant GDPR
 * flow in /api/gdpr/registrant-request, where the host is the controller).
 *
 * Built synchronously and returned directly, the same way the registrant
 * export at admin/webinar/[id]/attendees/[id]/data does — there is no
 * background job queue in this codebase, so pretending this takes "up to 24
 * hours" would be a promise the code cannot keep.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();

  const [
    { data: webinars },
    { data: teams },
    { data: teamMembership },
    { data: webhooks },
    { data: apiKeys },
    { data: invoices },
    { data: certificateTemplates },
    { data: series },
    { data: creatorProfile },
    { data: accessibilityPreferences },
  ] = await Promise.all([
    supabase.from("webinars").select("id, title, status, created_at").eq("owner_id", account.id),
    supabase.from("teams").select("id, name, plan_slug, created_at").eq("owner_id", account.id),
    supabase.from("team_members").select("team_id, role, status, accepted_at").eq("user_id", account.id),
    supabase.from("webhook_endpoints").select("id, url, description, events, is_active, created_at").eq("user_id", account.id),
    supabase.from("api_keys").select("id, name, created_at, last_used_at").eq("user_id", account.id),
    supabase.from("invoices").select("id, amount, status, paid_at, created_at").eq("user_id", account.id),
    supabase.from("certificate_templates").select("id, name, is_default").eq("user_id", account.id),
    supabase.from("webinar_series").select("id, title, created_at").eq("owner_id", account.id),
    supabase.from("creator_economy_profiles").select("*").eq("user_id", account.id).maybeSingle(),
    supabase.from("accessibility_preferences").select("*").eq("user_id", account.id).maybeSingle(),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: {
      id: account.id,
      full_name: account.full_name,
      email: account.email,
      plan_slug: account.plan_slug,
      subscription_status: account.subscription_status,
      created_at: account.created_at,
      referral_code: account.referral_code,
    },
    webinars: webinars ?? [],
    teams_owned: teams ?? [],
    team_memberships: teamMembership ?? [],
    webhooks: webhooks ?? [],
    api_keys: apiKeys ?? [],
    invoices: invoices ?? [],
    certificate_templates: certificateTemplates ?? [],
    series: series ?? [],
    creator_profile: creatorProfile ?? null,
    accessibility_preferences: accessibilityPreferences ?? null,
  };

  await supabase.from("data_export_requests").insert({
    user_id: account.id,
    request_type: "export",
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  await logAudit({
    action: "gdpr.export_requested",
    resourceType: "user_account",
    resourceId: account.id,
    userId: account.id,
    request,
  });

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="loopinglive-my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}

/** History of past export requests, for the Data Privacy Centre. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("data_export_requests")
    .select("id, request_type, status, requested_at, completed_at")
    .eq("user_id", account.id)
    .order("requested_at", { ascending: false });

  return NextResponse.json({ requests: data ?? [] });
}
