import { NextResponse } from "next/server";

import { CNAME_TARGET, addDomain, domainStatus, domainsConfigured, removeDomain } from "@/lib/domains/vercel";
import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

/**
 * Connects a customer's own domain to this webinar's registration page.
 *
 * This used to be a CNAME lookup and nothing else. It confirmed the record
 * had been typed correctly and then wrote "connected" — but a DNS record
 * pointing at a platform that has never heard of the hostname serves nothing,
 * and no certificate exists for a name nobody registered. Customers got a
 * green tick and a dead link in front of their own audience.
 *
 * Now the domain is registered against the project (which is what makes the
 * edge accept it and starts certificate issuance), and the status reported
 * back is Vercel's own view of DNS and the certificate rather than our guess.
 */
export async function POST(request: Request) {
  const { webinarId, domain } = (await request.json()) as {
    webinarId?: string;
    domain?: string;
  };

  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const hostname = domain?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  // Clearing the field disconnects the domain — and releases it at the edge
  // too, otherwise it stays attached to the project forever and cannot be
  // reconnected by anyone, including the same customer.
  if (!hostname) {
    const { data: existing } = await supabase
      .from("registration_page_config")
      .select("custom_domain")
      .eq("webinar_id", webinarId)
      .maybeSingle();

    if (existing?.custom_domain) await removeDomain(existing.custom_domain);

    await supabase
      .from("registration_page_config")
      .update({ custom_domain: null, custom_domain_status: "not_connected" })
      .eq("webinar_id", webinarId);

    return NextResponse.json({ success: true, status: "not_connected" });
  }

  if (!DOMAIN.test(hostname)) {
    return NextResponse.json({ error: "That does not look like a domain name." }, { status: 400 });
  }

  // One domain, one destination: the edge routes purely by hostname, so the
  // same name cannot front two different registration pages.
  const { data: clash } = await supabase
    .from("registration_page_config")
    .select("webinar_id")
    .eq("custom_domain", hostname)
    .neq("webinar_id", webinarId)
    .maybeSingle();

  if (clash) {
    return NextResponse.json(
      { error: "That domain is already connected to another of your webinars." },
      { status: 409 }
    );
  }

  if (!domainsConfigured()) {
    // Save the intent so nothing is lost, but never claim it is connected.
    await supabase
      .from("registration_page_config")
      .update({ custom_domain: hostname, custom_domain_status: "pending" })
      .eq("webinar_id", webinarId);

    return NextResponse.json({
      success: true,
      status: "pending",
      detail:
        "Custom domains are not configured on this deployment yet, so this domain has been saved but not activated.",
      target: CNAME_TARGET,
      records: [],
    });
  }

  let result;
  try {
    result = await addDomain(hostname);
  } catch (error) {
    await supabase
      .from("registration_page_config")
      .update({ custom_domain: hostname, custom_domain_status: "failed" })
      .eq("webinar_id", webinarId);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "That domain could not be connected." },
      { status: 502 }
    );
  }

  const status = result.verified ? "connected" : "pending";

  const { error } = await supabase
    .from("registration_page_config")
    .update({ custom_domain: hostname, custom_domain_status: status })
    .eq("webinar_id", webinarId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    status,
    detail: result.message,
    target: CNAME_TARGET,
    records: result.records,
  });
}

/** Re-checks a domain that was still propagating, without re-registering it. */
export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data: config } = await supabase
    .from("registration_page_config")
    .select("custom_domain, custom_domain_status")
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!config?.custom_domain) {
    return NextResponse.json({ status: "not_connected", target: CNAME_TARGET, records: [] });
  }
  if (!domainsConfigured()) {
    return NextResponse.json({
      status: config.custom_domain_status ?? "pending",
      domain: config.custom_domain,
      detail: "Custom domains are not configured on this deployment yet.",
      target: CNAME_TARGET,
      records: [],
    });
  }

  const result = await domainStatus(config.custom_domain);
  const status = result.verified ? "connected" : result.registered ? "pending" : "failed";

  if (status !== config.custom_domain_status) {
    await supabase
      .from("registration_page_config")
      .update({ custom_domain_status: status })
      .eq("webinar_id", webinarId);
  }

  return NextResponse.json({
    status,
    domain: config.custom_domain,
    detail: result.message,
    target: CNAME_TARGET,
    records: result.records,
  });
}
