import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { refreshCreatorStats } from "@/lib/creators/profile";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({ creatorId: z.string().uuid() });

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "creatorId is required" }, { status: 422 });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("creator_follows")
    .upsert(
      { follower_id: account.id, creator_id: parsed.data.creatorId },
      { onConflict: "follower_id,creator_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await supabase
    .from("creator_economy_profiles")
    .select("user_id")
    .eq("id", parsed.data.creatorId)
    .maybeSingle();

  if (profile?.user_id) await refreshCreatorStats(parsed.data.creatorId, profile.user_id);

  return NextResponse.json({ following: true });
}

export async function DELETE(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "creatorId is required" }, { status: 422 });

  const supabase = createServiceClient();
  await supabase
    .from("creator_follows")
    .delete()
    .eq("follower_id", account.id)
    .eq("creator_id", parsed.data.creatorId);

  const { data: profile } = await supabase
    .from("creator_economy_profiles")
    .select("user_id")
    .eq("id", parsed.data.creatorId)
    .maybeSingle();

  if (profile?.user_id) await refreshCreatorStats(parsed.data.creatorId, profile.user_id);

  return NextResponse.json({ following: false });
}
