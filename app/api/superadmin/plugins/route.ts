import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The review queue.
 *
 * `is_approved` starts false on every submission and nothing else flips it —
 * matching the marketplace-listing review queue this mirrors.
 */
export async function GET(request: Request) {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const supabase = createServiceClient();

  let query = supabase
    .from("plugins")
    .select("id, name, slug, description, version, category, developer_id, bundle_url, manifest, pricing_type, price, is_approved, is_active, created_at")
    .order("created_at", { ascending: false });

  query = status === "pending" ? query.eq("is_approved", false) : query.eq("is_approved", true);

  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plugins: data ?? [] });
}

const schema = z.object({
  pluginId: z.string().uuid(),
  action: z.enum(["approve", "reject", "deactivate"]),
});

/**
 * Approve, reject, or deactivate.
 *
 * "Reject" deletes rather than flags — a plugin that fails review has
 * nothing worth keeping around, unlike a listing that might be resubmitted
 * with the same id. A developer resubmits under the same slug either way,
 * which the submit route's upsert already handles.
 */
export async function POST(request: Request) {
  const { account, response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 422 });

  const supabase = createServiceClient();

  if (parsed.data.action === "reject") {
    await supabase.from("plugins").delete().eq("id", parsed.data.pluginId).eq("is_approved", false);
  } else {
    await supabase
      .from("plugins")
      .update({ is_approved: parsed.data.action === "approve", is_active: parsed.data.action !== "deactivate" })
      .eq("id", parsed.data.pluginId);
  }

  const AUDIT_ACTION: Record<typeof parsed.data.action, string> = {
    approve: "plugin.approved",
    reject: "plugin.rejected",
    deactivate: "plugin.deactivated",
  };

  await logAudit({
    action: AUDIT_ACTION[parsed.data.action],
    resourceType: "plugin",
    resourceId: parsed.data.pluginId,
    userId: account.id,
    request,
  });

  return NextResponse.json({ success: true });
}
