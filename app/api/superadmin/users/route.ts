import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SORTABLE = {
  created_at: "created_at",
  last_login_at: "last_login_at",
  full_name: "full_name",
  email: "email",
  plan_slug: "plan_slug",
} as const;

type SortKey = keyof typeof SORTABLE;

export async function GET(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const plan = params.get("plan");
  const status = params.get("status");
  const search = params.get("q")?.trim();

  // Paginated rather than capped. The previous .limit(200) made customer 201
  // invisible with nothing on screen to say so.
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const perPage = Math.min(100, Math.max(10, Number(params.get("limit") ?? 50) || 50));
  const from = (page - 1) * perPage;

  const sortParam = params.get("sort") ?? "created_at";
  const sort: SortKey = sortParam in SORTABLE ? (sortParam as SortKey) : "created_at";
  const ascending = params.get("dir") === "asc";

  const supabase = createServiceClient();

  let query = supabase
    .from("user_accounts")
    .select(
      "id, full_name, email, plan_slug, subscription_status, is_admin, is_suspended, suspended_reason, created_at, last_login_at, referral_code, admin_note",
      { count: "exact" }
    )
    .order(SORTABLE[sort], { ascending, nullsFirst: false })
    .range(from, from + perPage - 1);

  if (plan && plan !== "all") query = query.eq("plan_slug", plan);
  if (status === "suspended") query = query.eq("is_suspended", true);
  else if (status === "active") query = query.eq("is_suspended", false);
  else if (status === "past_due") query = query.eq("subscription_status", "past_due");
  if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Webinar counts for this page only, rather than loading every webinar on
  // the platform to count a few.
  const ids = rows.map((row) => row.id);
  const { data: webinars } = ids.length
    ? await supabase.from("webinars").select("owner_id").in("owner_id", ids)
    : { data: [] };

  const counts = new Map<string, number>();
  for (const row of webinars ?? []) {
    if (row.owner_id) counts.set(row.owner_id, (counts.get(row.owner_id) ?? 0) + 1);
  }

  return NextResponse.json({
    users: rows.map((user) => ({ ...user, webinars: counts.get(user.id) ?? 0 })),
    total: count ?? 0,
    page,
    limit: perPage,
    pages: Math.max(1, Math.ceil((count ?? 0) / perPage)),
  });
}
