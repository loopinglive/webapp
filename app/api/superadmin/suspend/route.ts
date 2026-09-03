import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { userId, suspended } = (await request.json()) as {
    userId?: string;
    suspended?: boolean;
  };

  if (!userId) {
    return NextResponse.json({ error: "A user is required." }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json({ error: "You cannot suspend yourself." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: target } = await supabase
    .from("user_accounts")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (target?.is_admin) {
    return NextResponse.json(
      { error: "Another admin cannot be suspended." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("user_accounts")
    .update({ is_suspended: Boolean(suspended) })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
