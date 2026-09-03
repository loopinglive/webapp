import { NextResponse } from "next/server";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Hosts whose dispute numbers cross a line worth a look.
 *
 * The line is the same one payment processors use before they start
 * restricting an account: dispute rate above 1% of transactions, or two
 * disputes open at once — a single unhappy customer does not produce a
 * pattern, that takes more than one.
 */
export async function GET() {
  const { response: denied } = await requireCapability("view_revenue");
  if (denied) return denied;

  const { data, error } = await createServiceClient().rpc("flagged_hosts");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ hosts: data ?? [] });
}
