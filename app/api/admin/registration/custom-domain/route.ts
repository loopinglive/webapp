import { promises as dns } from "node:dns";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const CNAME_TARGET = "cname.loopinglive.com";

const DOMAIN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

/**
 * Checks whether the host's DNS actually points here before we claim the domain
 * is connected.
 *
 * A real CNAME lookup, not a stored flag — "connected" should mean the record
 * resolves, otherwise the first attendee to use the link finds nothing.
 */
export async function POST(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId, domain } = (await request.json()) as {
    webinarId?: string;
    domain?: string;
  };

  if (!webinarId) {
    return NextResponse.json({ error: "webinarId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const hostname = domain?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  // Clearing the field disconnects the domain.
  if (!hostname) {
    await supabase
      .from("registration_page_config")
      .update({ custom_domain: null, custom_domain_status: "not_connected" })
      .eq("webinar_id", webinarId);
    return NextResponse.json({ success: true, status: "not_connected" });
  }

  if (!DOMAIN.test(hostname)) {
    return NextResponse.json(
      { error: "That does not look like a domain name." },
      { status: 400 }
    );
  }

  let status: "connected" | "pending" | "failed" = "pending";
  let detail = "";

  try {
    const records = await dns.resolveCname(hostname);
    const points = records.some(
      (record) => record.toLowerCase().replace(/\.$/, "") === CNAME_TARGET
    );
    status = points ? "connected" : "failed";
    detail = points
      ? ""
      : `That name points to ${records.join(", ")} rather than ${CNAME_TARGET}.`;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // ENODATA/ENOTFOUND usually just means the record has not propagated yet.
    status = code === "ENODATA" || code === "ENOTFOUND" ? "pending" : "failed";
    detail =
      status === "pending"
        ? "No CNAME found yet. DNS changes can take up to 48 hours."
        : "That domain could not be looked up.";
  }

  const { error } = await supabase
    .from("registration_page_config")
    .update({ custom_domain: hostname, custom_domain_status: status })
    .eq("webinar_id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status, detail, target: CNAME_TARGET });
}
