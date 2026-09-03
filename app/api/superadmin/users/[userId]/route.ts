import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/billing/account";
import { type AdminRole, roleCan } from "@/lib/billing/admin-roles";
import { sendPasswordReset } from "@/lib/auth/auth-emails";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Client = ReturnType<typeof createServiceClient>;

/** One admin action, recorded. Never blocks the action it describes. */
async function record(
  supabase: Client,
  adminId: string,
  targetUserId: string,
  action: string,
  detail: Record<string, unknown> = {}
) {
  await supabase
    .from("admin_actions")
    .insert({
      admin_id: adminId,
      target_user_id: targetUserId,
      action,
      detail: detail as never,
    })
    .then(() => undefined);
}

/**
 * Everything known about one customer, on one screen.
 *
 * Deliberately assembled server-side in a single request: a support person
 * reading this is mid-conversation, and six sequential fetches from the
 * browser is six chances to look broken.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { account: viewer, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { userId } = await params;
  const supabase = createServiceClient();

  const { data: account } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "No such user." }, { status: 404 });
  }

  const [
    { data: webinars },
    { data: invoices },
    { data: flags },
    { data: keys },
    { data: endpoints },
    { data: integrations },
    { data: affiliate },
    { data: actions },
    { data: impersonations },
  ] = await Promise.all([
    supabase
      .from("webinars")
      .select("id, title, status, created_at, video_url")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, amount, currency, status, plan_slug, paid_at, created_at, invoice_pdf_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("feature_flags").select("id, flag_name, is_enabled").eq("user_id", userId),
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, is_active")
      .eq("user_id", userId),
    supabase
      .from("webhook_endpoints")
      .select("id, url, is_active, events")
      .eq("user_id", userId),
    supabase
      .from("integrations")
      .select("provider, status, last_error, last_synced_at")
      .eq("user_id", userId),
    supabase
      .from("affiliates")
      .select("referral_code, total_referrals, total_earnings, pending_earnings, paid_earnings, is_active")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("admin_actions")
      .select("action, detail, created_at, admin_id")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("impersonation_logs")
      .select("reason, started_at, ended_at")
      .eq("impersonated_user_id", userId)
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  const webinarIds = (webinars ?? []).map((w) => w.id);

  // The screen that answers "why didn't my reminders send?" — the provider's
  // own error string, not our summary of it.
  const [{ data: messages }, { count: registrantCount }, { data: errors }] =
    await Promise.all([
      webinarIds.length
        ? supabase
            .from("scheduled_messages")
            .select("id, channel, status, template_key, subject, error_message, scheduled_for, sent_at, recipient_email")
            .in("webinar_id", webinarIds)
            .order("scheduled_for", { ascending: false })
            .limit(60)
        : Promise.resolve({ data: [] as unknown[] }),
      webinarIds.length
        ? supabase
            .from("registrants")
            .select("id", { count: "exact", head: true })
            .in("webinar_id", webinarIds)
        : Promise.resolve({ count: 0 }),
      supabase
        .from("error_logs")
        .select("error_type, error_message, page_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  // Activity timeline, built from what actually happened rather than a stored
  // list of steps someone clicked.
  const timeline: { at: string; label: string; kind: string }[] = [
    { at: account.created_at, label: "Signed up", kind: "account" },
  ];
  for (const webinar of webinars ?? []) {
    timeline.push({
      at: webinar.created_at,
      label: `Created "${webinar.title}"`,
      kind: "webinar",
    });
  }
  for (const invoice of invoices ?? []) {
    timeline.push({
      at: invoice.paid_at ?? invoice.created_at,
      label:
        invoice.status === "paid"
          ? `Paid ${invoice.amount} ${invoice.currency?.toUpperCase()} — ${invoice.plan_slug}`
          : `Invoice ${invoice.status} — ${invoice.plan_slug}`,
      kind: "billing",
    });
  }
  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // The viewer's own role travels with the payload so the screen can hide
  // controls it would only refuse. The server still enforces every one of
  // them — this is about not offering a button that cannot work.
  const viewerRole = ((viewer.admin_role as AdminRole | null) ?? "owner") as AdminRole;

  return NextResponse.json({
    account,
    viewerRole,
    viewerCan: {
      impersonate: roleCan(viewerRole, "impersonate"),
      suspend: roleCan(viewerRole, "suspend"),
      grantPlans: roleCan(viewerRole, "grant_plans"),
      billingActions: roleCan(viewerRole, "billing_actions"),
      editCustomers: roleCan(viewerRole, "edit_customers"),
      manageAdmins: roleCan(viewerRole, "manage_admins"),
    },
    webinars: webinars ?? [],
    invoices: invoices ?? [],
    messages: messages ?? [],
    registrantCount: registrantCount ?? 0,
    flags: flags ?? [],
    apiKeys: keys ?? [],
    webhookEndpoints: endpoints ?? [],
    integrations: integrations ?? [],
    affiliate: affiliate ?? null,
    adminActions: actions ?? [],
    impersonations: impersonations ?? [],
    errors: errors ?? [],
    timeline: timeline.slice(0, 40),
  });
}

const patchSchema = z.object({
  adminNote: z.string().max(4000).optional(),
  email: z.string().email().toLowerCase().optional(),
  suspend: z.boolean().optional(),
  suspendReason: z.string().max(500).optional(),
  setFlag: z.object({ name: z.string().min(1).max(60), enabled: z.boolean() }).optional(),
  sendPasswordReset: z.boolean().optional(),
});

/** The support actions: notes, email correction, suspension, flags, resets. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { userId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();

  const { data: target } = await supabase
    .from("user_accounts")
    .select("id, email, full_name, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "No such user." }, { status: 404 });

  const body = parsed.data;

  if (body.adminNote !== undefined) {
    await supabase
      .from("user_accounts")
      .update({ admin_note: body.adminNote })
      .eq("id", userId);
    await record(supabase, admin.id, userId, "note_updated");
  }

  if (body.email && body.email !== target.email) {
    // Both records have to move together, or the app and auth disagree about
    // who this person is.
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      email: body.email,
      email_confirm: true,
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    await supabase.from("user_accounts").update({ email: body.email }).eq("id", userId);
    await record(supabase, admin.id, userId, "email_changed", {
      from: target.email,
      to: body.email,
    });
  }

  if (body.suspend !== undefined) {
    if (target.is_admin) {
      return NextResponse.json(
        { error: "Another admin cannot be suspended." },
        { status: 403 }
      );
    }
    if (userId === admin.id) {
      return NextResponse.json({ error: "You cannot suspend yourself." }, { status: 400 });
    }

    await supabase
      .from("user_accounts")
      .update({
        is_suspended: body.suspend,
        suspended_reason: body.suspend ? (body.suspendReason ?? null) : null,
        suspended_at: body.suspend ? new Date().toISOString() : null,
      })
      .eq("id", userId);

    await record(supabase, admin.id, userId, body.suspend ? "suspended" : "unsuspended", {
      reason: body.suspendReason ?? null,
    });
  }

  if (body.setFlag) {
    await supabase.from("feature_flags").upsert(
      {
        user_id: userId,
        flag_name: body.setFlag.name,
        is_enabled: body.setFlag.enabled,
      },
      { onConflict: "user_id,flag_name" }
    );
    await record(supabase, admin.id, userId, "flag_changed", body.setFlag);
  }

  if (body.sendPasswordReset) {
    await sendPasswordReset(target.email);
    await record(supabase, admin.id, userId, "password_reset_sent");
  }

  return NextResponse.json({ success: true });
}
