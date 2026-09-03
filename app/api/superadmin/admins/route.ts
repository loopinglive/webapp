import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Who has a key to the platform, and what it opens. */
export async function GET() {
  const { response: denied } = await requireCapability("manage_admins");
  if (denied) return denied;

  const { data } = await createServiceClient()
    .from("user_accounts")
    .select("id, full_name, email, admin_role, created_at, last_login_at")
    .eq("is_admin", true)
    .order("created_at", { ascending: true });

  return NextResponse.json({ admins: data ?? [] });
}

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "support", "finance"]).nullable(),
});

/**
 * Grants, changes or revokes an admin role.
 *
 * A null role revokes admin entirely rather than leaving someone flagged as an
 * admin with no capabilities — that state would pass `is_admin` checks written
 * before roles existed and is worse than either alternative.
 */
export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireCapability("manage_admins");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const { userId, role } = parsed.data;
  const supabase = createServiceClient();

  const { data: target } = await supabase
    .from("user_accounts")
    .select("id, email, is_admin, admin_role")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "No such user." }, { status: 404 });

  // Demoting yourself locks you out of the screen you are standing on, and the
  // only way back is a SQL console.
  if (userId === admin.id && role !== "owner") {
    return NextResponse.json(
      { error: "You cannot remove your own owner role. Ask another owner." },
      { status: 400 }
    );
  }

  // The last owner is the platform's only route back in. Counted at the moment
  // of the change rather than trusted from the page that rendered the button.
  if (target.admin_role === "owner" && role !== "owner") {
    const { count } = await supabase
      .from("user_accounts")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true)
      .eq("admin_role", "owner");

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "That is the last owner. Promote someone else first." },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase
    .from("user_accounts")
    .update({ is_admin: role !== null, admin_role: role })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("admin_actions").insert({
    admin_id: admin.id,
    target_user_id: userId,
    action: role ? "admin_role_granted" : "admin_revoked",
    detail: { from: target.admin_role, to: role, email: target.email } as never,
  });

  return NextResponse.json({ success: true, role });
}
