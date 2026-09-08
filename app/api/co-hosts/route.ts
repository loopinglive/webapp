import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { DEFAULT_PERMISSIONS, parsePermissions, type CoHostPermissions } from "@/lib/co-hosts/access";
import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { sendEmail } from "@/lib/messaging/providers";
import { SITE } from "@/lib/constants";
import { requireWebinarAccess } from "@/lib/webinar-access";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

const INVITE_TTL_DAYS = 7;

export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data: coHosts } = await supabase
    .from("co_hosts")
    .select("id, co_host_email, co_host_user_id, permissions, status, invited_at, accepted_at, invite_expires_at")
    .eq("webinar_id", webinarId)
    .order("invited_at", { ascending: false });

  return NextResponse.json({ coHosts: coHosts ?? [] });
}

const inviteSchema = z.object({
  webinarId: z.string().uuid(),
  email: z.string().email(),
  permissions: z
    .object({ chat: z.boolean(), moderate: z.boolean(), offers: z.boolean(), analytics: z.boolean() })
    .partial()
    .optional(),
});

function summarise(permissions: CoHostPermissions): string {
  const parts = [
    permissions.chat && "post in the live chat",
    permissions.moderate && "moderate attendees",
    permissions.offers && "control the offer",
    permissions.analytics && "see the analytics",
  ].filter(Boolean) as string[];

  if (parts.length === 0) return "join the session";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export async function POST(request: Request) {
  const parsed = inviteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const { webinarId, email } = parsed.data;

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const permissions = parsePermissions({ ...DEFAULT_PERMISSIONS, ...(parsed.data.permissions ?? {}) } as Json);
  const supabase = createServiceClient();

  const { data: webinar } = await supabase.from("webinars").select("title, owner_id").eq("id", webinarId).maybeSingle();
  if (!webinar) return NextResponse.json({ error: "Webinar not found" }, { status: 404 });

  // Inviting someone who already has an account links them straight away, so
  // accepting is a single click rather than a sign-up detour.
  const { data: existingAccount } = await supabase.from("user_accounts").select("id").eq("email", email).maybeSingle();

  if (existingAccount?.id) {
    const { data: already } = await supabase
      .from("co_hosts")
      .select("id")
      .eq("webinar_id", webinarId)
      .eq("co_host_user_id", existingAccount.id)
      .maybeSingle();
    if (already) return NextResponse.json({ error: "That person is already a co-host on this webinar." }, { status: 409 });
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();

  const { data: coHost, error } = await supabase
    .from("co_hosts")
    .insert({
      webinar_id: webinarId,
      host_user_id: webinar.owner_id,
      co_host_user_id: existingAccount?.id ?? null,
      co_host_email: email,
      permissions: permissions as unknown as Json,
      status: "invited",
      invite_token: token,
      invite_expires_at: expiresAt,
    })
    .select("id, co_host_email, permissions, status, invited_at, invite_expires_at")
    .single();

  if (error || !coHost) return NextResponse.json({ error: error?.message ?? "Could not send the invitation." }, { status: 500 });

  const { data: inviter } = access.account?.id
    ? await supabase.from("user_accounts").select("full_name").eq("id", access.account.id).maybeSingle()
    : { data: null };

  try {
    const { subject, html, text } = renderPlatformEmail(
      "co_host_invite",
      {
        inviter_name: inviter?.full_name || "The host",
        webinar_title: webinar.title,
        permission_summary: summarise(permissions),
        accept_link: `${SITE.url}/co-host/accept/${token}`,
      },
      { brandName: SITE.name }
    );
    await sendEmail({
      to: email,
      fromName: SITE.name,
      fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
      subject,
      html,
      text,
    });
  } catch {
    // The row exists and the link is retrievable from the manager UI, so a
    // failed email is not a failed invitation.
  }

  return NextResponse.json({ coHost });
}

export async function DELETE(request: Request) {
  const { id, webinarId } = (await request.json().catch(() => ({}))) as { id?: string; webinarId?: string };
  if (!id || !webinarId) return NextResponse.json({ error: "id and webinarId are required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  // Deleting the row is the revocation: every co-host action re-checks it
  // server-side, so access stops on their next request, mid-session included.
  const { error } = await supabase.from("co_hosts").delete().eq("id", id).eq("webinar_id", webinarId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
