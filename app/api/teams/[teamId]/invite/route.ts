import { NextResponse } from "next/server";
import { z } from "zod";

import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { sendEmail } from "@/lib/messaging/providers";
import { SITE } from "@/lib/constants";
import { requireTeamCapability } from "@/lib/teams/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(["admin", "editor", "viewer"]),
});

/**
 * Invites someone to the team by email.
 *
 * The invitation carries its own token rather than an account id, because the
 * invited person very often does not have a Loopinglive account yet — the
 * token is what lets `accept-invite` create one or attach to an existing one
 * without the team having to know which in advance.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const { account, response: denied } = await requireTeamCapability(
    teamId,
    "manage_members"
  );
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid email and role are required." },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, max_members")
    .eq("id", teamId)
    .maybeSingle();

  if (!team) return NextResponse.json({ error: "No such team." }, { status: 404 });

  const [{ count: activeCount }, { data: existingMember }, { data: existingInvite }] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "active"),
      supabase
        .from("user_accounts")
        .select("id")
        .eq("email", parsed.data.email)
        .maybeSingle(),
      supabase
        .from("team_invitations")
        .select("id")
        .eq("team_id", teamId)
        .eq("invited_email", parsed.data.email)
        .is("accepted_at", null)
        .maybeSingle(),
    ]);

  if ((activeCount ?? 0) >= team.max_members) {
    return NextResponse.json(
      { error: `This team is at its limit of ${team.max_members} members.` },
      { status: 400 }
    );
  }

  if (existingMember) {
    const { data: alreadyOnTeam } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", existingMember.id)
      .maybeSingle();
    if (alreadyOnTeam) {
      return NextResponse.json(
        { error: "That person is already on this team." },
        { status: 400 }
      );
    }
  }

  // A resend replaces the pending invitation rather than stacking a second
  // one — the recipient only ever has one live link to worry about.
  if (existingInvite) {
    await supabase.from("team_invitations").delete().eq("id", existingInvite.id);
  }

  const { data: invitation, error } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      invited_email: parsed.data.email,
      role: parsed.data.role,
      invited_by: account.id,
    })
    .select("id, token")
    .single();

  if (error || !invitation) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create the invitation." },
      { status: 500 }
    );
  }

  const { html, text, subject } = renderPlatformEmail(
    "host_team_invitation",
    {
      inviter_name: account.full_name || "A teammate",
      team_name: team.name,
      role: parsed.data.role,
      invite_link: `${SITE.url}/team/accept-invite?token=${invitation.token}`,
    },
    { brandName: "Loopinglive" }
  );

  const result = await sendEmail({
    to: parsed.data.email,
    fromName: "Loopinglive",
    fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
    subject,
    html,
    text,
  });

  if (!result.ok) {
    // The invitation still exists and can be resent — a delivery failure is
    // not a reason to make them start the whole thing over.
    return NextResponse.json(
      { invitation, warning: "Created, but the email did not send." },
      { status: 207 }
    );
  }

  return NextResponse.json({ invitation });
}
