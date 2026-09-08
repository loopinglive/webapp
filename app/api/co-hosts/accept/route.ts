import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Claims an invitation for the signed-in account. The token proves the invitation; the session proves who is accepting it. */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { token } = (await request.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: invite } = await supabase
    .from("co_hosts")
    .select("id, webinar_id, co_host_user_id, co_host_email, status, invite_expires_at")
    .eq("invite_token", token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "That invitation link is not valid." }, { status: 404 });
  if (invite.status === "accepted" && invite.co_host_user_id === account.id) {
    return NextResponse.json({ webinarId: invite.webinar_id, alreadyAccepted: true });
  }
  if (invite.invite_expires_at && new Date(invite.invite_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "That invitation has expired. Ask the host to send a new one." }, { status: 410 });
  }

  // An invitation addressed to a specific account can only be claimed by it —
  // otherwise a forwarded link would hand co-host rights to whoever opened it.
  if (invite.co_host_user_id && invite.co_host_user_id !== account.id) {
    return NextResponse.json({ error: "This invitation belongs to a different account." }, { status: 403 });
  }
  if (!invite.co_host_user_id && invite.co_host_email && invite.co_host_email.toLowerCase() !== account.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invitation was sent to ${invite.co_host_email}. Sign in with that account to accept it.` },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("co_hosts")
    .update({
      co_host_user_id: account.id,
      status: "accepted",
      accepted_at: new Date().toISOString(),
      // Spent — the link cannot be replayed by anyone else later.
      invite_token: null,
    })
    .eq("id", invite.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webinarId: invite.webinar_id });
}
