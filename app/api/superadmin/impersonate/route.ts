import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COOKIE = "loopinglive_impersonating";
const ONE_HOUR = 60 * 60;

/**
 * Starts an impersonation session.
 *
 * This does not swap the auth session — the admin stays signed in as
 * themselves and the app reads the impersonation cookie to decide whose data
 * to show. That keeps every write attributable to the real admin, and means an
 * expired cookie degrades to "admin sees their own account" rather than to a
 * half-authenticated state.
 */
export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { userId, reason } = (await request.json()) as {
    userId?: string;
    reason?: string;
  };

  if (!userId) {
    return NextResponse.json({ error: "A user is required." }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json(
      { error: "You are already yourself." },
      { status: 400 }
    );
  }
  if (!reason?.trim()) {
    return NextResponse.json(
      { error: "A reason is required and is recorded." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: target } = await supabase
    .from("user_accounts")
    .select("id, full_name, email, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "No such user." }, { status: 404 });
  }
  // An admin impersonating an admin would let one admin act as another with
  // no way to tell them apart in the logs.
  if (target.is_admin) {
    return NextResponse.json(
      { error: "Admins cannot impersonate other admins." },
      { status: 403 }
    );
  }

  const { data: log } = await supabase
    .from("impersonation_logs")
    .insert({
      admin_id: admin.id,
      impersonated_user_id: userId,
      reason: reason.trim(),
    })
    .select("id")
    .single();

  const response = NextResponse.json({
    success: true,
    user: { id: target.id, name: target.full_name, email: target.email },
  });

  response.cookies.set(
    COOKIE,
    JSON.stringify({ userId, logId: log?.id ?? null }),
    {
      maxAge: ONE_HOUR,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    }
  );

  return response;
}

/** Ends impersonation and closes the log entry. */
export async function DELETE(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const raw = request.headers
    .get("cookie")
    ?.split("; ")
    .find((row) => row.startsWith(`${COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  if (raw) {
    try {
      const { logId } = JSON.parse(decodeURIComponent(raw)) as { logId?: string };
      if (logId) {
        await createServiceClient()
          .from("impersonation_logs")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", logId);
      }
    } catch {
      // A malformed cookie still gets cleared below.
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
