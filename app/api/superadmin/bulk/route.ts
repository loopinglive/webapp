import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability, roleCan, type AdminRole } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The same change to a lot of accounts.
 *
 * Capped rather than unbounded. Anything above this is a migration, and a
 * migration deserves someone thinking about it rather than a button — the cap
 * is the point, not a technical limit.
 */
const MAX_IDS = 200;

const schema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(MAX_IDS),
  action: z.enum(["suspend", "unsuspend", "grant_plan", "add_note"]),
  planSlug: z.enum(["free", "monthly", "yearly", "lifetime"]).optional(),
  reason: z.string().max(500).trim().optional(),
  note: z.string().max(2000).trim().optional(),
  confirm: z.literal(true),
});

export async function POST(request: Request) {
  // Read access first; the specific capability depends on the action.
  const { account: admin, role, response: denied } =
    await requireCapability("view_customers");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "A list of users, an action and an explicit confirmation are required.",
      },
      { status: 422 }
    );
  }

  const { userIds, action } = parsed.data;

  /*
   * The bulk endpoint must not be a way around the per-action permissions.
   *
   * Support cannot suspend in bulk if support cannot suspend, and finance
   * cannot grant plans in bulk unless finance can grant plans. Checked here
   * rather than trusted from the screen that offered the button.
   */
  const needed =
    action === "grant_plan"
      ? "grant_plans"
      : action === "add_note"
        ? "edit_customers"
        : "suspend";

  if (!roleCan(role as AdminRole, needed)) {
    return NextResponse.json(
      { error: `Your role cannot ${action.replace("_", " ")} in bulk either.` },
      { status: 403 }
    );
  }

  if (action === "suspend" && !parsed.data.reason) {
    return NextResponse.json(
      { error: "A reason is required and is recorded against every account." },
      { status: 400 }
    );
  }
  if (action === "grant_plan" && !parsed.data.planSlug) {
    return NextResponse.json({ error: "Pick a plan." }, { status: 400 });
  }
  if (action === "add_note" && !parsed.data.note) {
    return NextResponse.json({ error: "Write the note." }, { status: 400 });
  }

  const supabase = createServiceClient();

  /*
   * Never the admin doing the work, and never another admin.
   *
   * A bulk suspend that catches the person running it locks them out mid-task,
   * and one admin suspending another is a fight the product should not host.
   * Filtered rather than refused: the alternative is a bulk action that fails
   * entirely because one row in two hundred was an admin.
   */
  const { data: targets } = await supabase
    .from("user_accounts")
    .select("id, is_admin, admin_note")
    .in("id", userIds);

  const eligible = (targets ?? []).filter(
    (target) => !target.is_admin && target.id !== admin.id
  );
  const skipped = userIds.length - eligible.length;

  if (eligible.length === 0) {
    return NextResponse.json(
      { error: "Nothing to do — every account selected is an admin." },
      { status: 400 }
    );
  }

  const ids = eligible.map((target) => target.id);
  const now = new Date().toISOString();
  let changed = 0;

  if (action === "suspend" || action === "unsuspend") {
    const { error } = await supabase
      .from("user_accounts")
      .update(
        action === "suspend"
          ? {
              is_suspended: true,
              suspended_reason: parsed.data.reason ?? null,
              suspended_at: now,
            }
          : { is_suspended: false, suspended_reason: null, suspended_at: null }
      )
      .in("id", ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    changed = ids.length;
  }

  if (action === "grant_plan") {
    const { error } = await supabase
      .from("user_accounts")
      .update({
        plan_slug: parsed.data.planSlug!,
        subscription_status: "active",
        plan_started_at: now,
      })
      .in("id", ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    changed = ids.length;
  }

  if (action === "add_note") {
    /*
     * Appended, one row at a time.
     *
     * A note is not a field to overwrite — it is what the last person handling
     * the account wanted the next one to know, and a bulk update that replaced
     * it would destroy exactly the context the note exists to carry.
     */
    for (const target of eligible) {
      const existing = target.admin_note?.trim();
      await supabase
        .from("user_accounts")
        .update({
          admin_note: existing
            ? `${existing}\n\n${parsed.data.note}`
            : parsed.data.note!,
        })
        .eq("id", target.id);
      changed += 1;
    }
  }

  // One entry for the batch, plus the ids, so the audit log stays readable
  // instead of two hundred near-identical lines.
  await supabase.from("admin_actions").insert({
    admin_id: admin.id,
    action: `bulk_${action}`,
    detail: {
      count: changed,
      skipped,
      planSlug: parsed.data.planSlug ?? null,
      reason: parsed.data.reason ?? null,
      userIds: ids,
    } as never,
  });

  return NextResponse.json({ changed, skipped });
}
