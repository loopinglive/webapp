import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The one active announcement to show, newest first. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ announcement: null });

  const now = new Date().toISOString();

  const { data: candidates } = await createServiceClient()
    .from("platform_announcements")
    .select("id, title, body, type, target_plans")
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(10);

  // Targeting is applied here rather than in the query because an empty array
  // means "everyone", which is awkward to express in PostgREST and trivial
  // here. Ten candidates is plenty to find the newest that applies.
  const announcement =
    (candidates ?? []).find((row) => {
      const plans = (row.target_plans as string[] | null) ?? [];
      return plans.length === 0 || plans.includes(account.plan_slug);
    }) ?? null;

  return NextResponse.json({
    announcement: announcement
      ? {
          id: announcement.id,
          title: announcement.title,
          body: announcement.body,
          type: announcement.type,
        }
      : null,
  });
}
