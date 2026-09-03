import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const plan = params.get("plan");
  const status = params.get("status");
  const search = params.get("q")?.trim();

  const supabase = createServiceClient();
  let query = supabase
    .from("user_accounts")
    .select("id, full_name, email, plan_slug, subscription_status, is_admin, is_suspended, created_at, last_login_at, referral_code")
    .order("created_at", { ascending: false })
    .limit(200);

  if (plan && plan !== "all") query = query.eq("plan_slug", plan);
  if (status === "suspended") query = query.eq("is_suspended", true);
  else if (status === "active") query = query.eq("is_suspended", false);
  else if (status === "past_due") query = query.eq("subscription_status", "past_due");
  if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Webinar counts, fetched once rather than per row.
  const { data: webinars } = await supabase.from("webinars").select("owner_id");
  const counts = new Map<string, number>();
  for (const row of webinars ?? []) {
    if (row.owner_id) counts.set(row.owner_id, (counts.get(row.owner_id) ?? 0) + 1);
  }

  return NextResponse.json({
    users: (data ?? []).map((user) => ({
      ...user,
      webinars: counts.get(user.id) ?? 0,
    })),
  });
}
