import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { CNAME_TARGET, addDomain, domainStatus, domainsConfigured } from "@/lib/domains/vercel";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Connects and checks a white-label account domain.
 *
 * Previously a CNAME lookup against a hardcoded target that did not itself
 * resolve, writing custom_domain_verified from the result. That marked a
 * domain verified when it could not serve anything: the edge rejects
 * hostnames the project has never registered, and nothing had registered it.
 *
 * Registration and certificate issuance now happen here, and the verified
 * flag reflects Vercel's own view rather than a DNS string comparison.
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

  if (!domainsConfigured()) {
    return NextResponse.json({
      verified: false,
      expected: CNAME_TARGET,
      records: [],
      detail: "Custom domains are not configured on this deployment yet.",
    });
  }

  let result;
  try {
    // Idempotent: a domain already attached to this project is treated as
    // success, so re-checking never breaks a working setup.
    result = await addDomain(config.custom_domain);
  } catch (error) {
    await service
      .from("white_label_configs")
      .update({ custom_domain_verified: false })
      .eq("user_id", account.id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "That domain could not be connected." },
      { status: 502 }
    );
  }

  await service
    .from("white_label_configs")
    .update({ custom_domain_verified: result.verified })
    .eq("user_id", account.id);

  return NextResponse.json({
    verified: result.verified,
    expected: CNAME_TARGET,
    records: result.records,
    detail: result.message,
  });
}

/** Status without re-registering, for polling while DNS propagates. */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const service = createServiceClient();
  const { data: config } = await service
    .from("white_label_configs")
    .select("custom_domain, custom_domain_verified")
    .eq("user_id", account.id)
    .maybeSingle();

  if (!config?.custom_domain) {
    return NextResponse.json({ verified: false, expected: CNAME_TARGET, records: [] });
  }
  if (!domainsConfigured()) {
    return NextResponse.json({
      verified: false,
      expected: CNAME_TARGET,
      records: [],
      detail: "Custom domains are not configured on this deployment yet.",
    });
  }

  const result = await domainStatus(config.custom_domain);

  if (result.verified !== config.custom_domain_verified) {
    await service
      .from("white_label_configs")
      .update({ custom_domain_verified: result.verified })
      .eq("user_id", account.id);
  }

  return NextResponse.json({
    verified: result.verified,
    expected: CNAME_TARGET,
    records: result.records,
    detail: result.message,
  });
}
