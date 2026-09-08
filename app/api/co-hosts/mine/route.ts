import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { parsePermissions } from "@/lib/co-hosts/access";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The webinars this account co-hosts — someone else's webinars, so they never appear in the normal webinar list. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("co_hosts")
    .select("id, webinar_id, permissions, status, accepted_at, webinars(title, status)")
    .eq("co_host_user_id", account.id)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false });

  return NextResponse.json({
    coHosting: (rows ?? []).map((row) => ({ ...row, permissions: parsePermissions(row.permissions) })),
  });
}
