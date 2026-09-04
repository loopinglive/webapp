import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTeamCapability } from "@/lib/teams/auth";
import type { TeamMemberRow } from "@/types/database";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Active members plus pending invitations, so one screen shows the whole roster. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const { response: denied } = await requireTeamCapability(teamId, "view_all_webinars");
  if (denied) return denied;

  const supabase = createServiceClient();

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, user_id, role, status, invited_at, accepted_at, permissions")
      .eq("team_id", teamId)
      .order("invited_at", { ascending: true }),
    supabase
      .from("team_invitations")
      .select("id, invited_email, role, expires_at, created_at")
      .eq("team_id", teamId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const userIds = (members ?? []).map((member) => member.user_id);
  const { data: accounts } = userIds.length
    ? await supabase
        .from("user_accounts")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] };

  const byId = new Map((accounts ?? []).map((account) => [account.id, account]));

  return NextResponse.json({
    members: (members ?? []).map((member) => ({
      ...member,
      full_name: byId.get(member.user_id)?.full_name ?? null,
      email: byId.get(member.user_id)?.email ?? null,
    })),
    invitations: invitations ?? [],
  });
}

const patchSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["admin", "editor", "viewer"]).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  remove: z.boolean().optional(),
});

/** Changes a member's role or permissions, or removes them. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const { account, response: denied } = await requireTeamCapability(
    teamId,
    "manage_members"
  );
  if (denied) return denied;

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: target } = await supabase
    .from("team_members")
    .select("id, user_id, role")
    .eq("id", parsed.data.memberId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "No such member." }, { status: 404 });

  // The owner role is not assignable and not removable through this route —
  // there is exactly one owner, and changing that is a "transfer ownership"
  // decision this endpoint does not make.
  if (target.role === "owner") {
    return NextResponse.json(
      { error: "The owner cannot be changed here." },
      { status: 400 }
    );
  }
  if (target.user_id === account.id) {
    return NextResponse.json(
      { error: "You cannot change your own membership." },
      { status: 400 }
    );
  }

  if (parsed.data.remove) {
    await supabase.from("team_members").delete().eq("id", target.id);
    await supabase
      .from("user_accounts")
      .update({ team_id: null, team_role: null })
      .eq("id", target.user_id)
      .eq("team_id", teamId);
    return NextResponse.json({ removed: true });
  }

  const patch: Partial<Pick<TeamMemberRow, "role" | "permissions">> = {};
  if (parsed.data.role) patch.role = parsed.data.role;
  if (parsed.data.permissions) patch.permissions = parsed.data.permissions;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const { error } = await supabase
    .from("team_members")
    .update(patch)
    .eq("id", target.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (parsed.data.role) {
    await supabase
      .from("user_accounts")
      .update({ team_role: parsed.data.role })
      .eq("id", target.user_id);
  }

  return NextResponse.json({ success: true });
}
