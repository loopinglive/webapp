import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Looks up an invitation by token, for the banner to show before accepting. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: invitation } = await supabase
    .from("team_invitations")
    .select("id, team_id, invited_email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json({ error: "That invitation does not exist." }, { status: 404 });
  }
  if (invitation.accepted_at) {
    return NextResponse.json({ error: "Already accepted." }, { status: 400 });
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }

  const { data: team } = await supabase
    .from("teams")
    .select("name, logo_url")
    .eq("id", invitation.team_id)
    .maybeSingle();

  return NextResponse.json({
    invitedEmail: invitation.invited_email,
    role: invitation.role,
    team,
  });
}

const schema = z.object({ token: z.string().min(1) });

/**
 * Accepts an invitation.
 *
 * The signed-in account's own email has to match the invited address —
 * otherwise anyone who intercepted the link could join a team meant for
 * someone else, and a signed-in-as-the-wrong-person accept would be a
 * confusing way to discover that.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "token is required" }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: invitation } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json({ error: "That invitation does not exist." }, { status: 404 });
  }
  if (invitation.accepted_at) {
    return NextResponse.json({ error: "Already accepted." }, { status: 400 });
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }
  if (invitation.invited_email.toLowerCase() !== account.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invitation was sent to ${invitation.invited_email}.` },
      { status: 403 }
    );
  }
  if (account.team_id) {
    return NextResponse.json(
      { error: "Leave your current team before joining another." },
      { status: 400 }
    );
  }

  const { data: team } = await supabase
    .from("teams")
    .select("max_members")
    .eq("id", invitation.team_id)
    .maybeSingle();

  const { count: activeCount } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", invitation.team_id)
    .eq("status", "active");

  if (team && (activeCount ?? 0) >= team.max_members) {
    return NextResponse.json(
      { error: "This team has since reached its member limit." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  await supabase.from("team_members").insert({
    team_id: invitation.team_id,
    user_id: account.id,
    role: invitation.role,
    invited_by: invitation.invited_by,
    invited_at: invitation.created_at,
    accepted_at: now,
    status: "active",
  });

  await supabase
    .from("user_accounts")
    .update({ team_id: invitation.team_id, team_role: invitation.role })
    .eq("id", account.id);

  await supabase
    .from("team_invitations")
    .update({ accepted_at: now })
    .eq("id", invitation.id);

  return NextResponse.json({ teamId: invitation.team_id, role: invitation.role });
}
