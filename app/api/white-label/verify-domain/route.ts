import { NextResponse } from "next/server";
import { resolveCname } from "node:dns/promises";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EXPECTED_TARGET = "cname.loopinglive.com";

/**
 * Verifies a custom domain's CNAME points at Loopinglive before the domain is
 * trusted to serve anyone's registration or watch pages.
 */
export async function POST() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const service = createServiceClient();
  const { data: config } = await service
    .from("white_label_configs")
    .select("custom_domain")
    .eq("user_id", account.id)
    .maybeSingle();

  if (!config?.custom_domain) {
    return NextResponse.json({ error: "No custom domain is set." }, { status: 400 });
  }

  let verified = false;
  let detail = "";

  try {
    const records = await resolveCname(config.custom_domain);
    verified = records.some((record) => record.toLowerCase().replace(/\.$/, "") === EXPECTED_TARGET);
    detail = records.join(", ");
  } catch (err) {
    detail = err instanceof Error ? err.message : "DNS lookup failed";
  }

  await service
    .from("white_label_configs")
    .update({ custom_domain_verified: verified })
    .eq("user_id", account.id);

  return NextResponse.json({
    verified,
    expected: EXPECTED_TARGET,
    detail,
  });
}
