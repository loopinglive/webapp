import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { verifyInbound, type FederationAction } from "@/lib/federation/protocol";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_AUDIENCE_PER_CALL = 500;

/**
 * What a partner instance is allowed to ask of us.
 *
 * Each action is gated on the flag the host actually ticked for that
 * partnership — a valid key is permission to talk, not permission to take
 * whatever it likes. Audience sharing moves hashed emails only: this side
 * never receives or stores a partner's plaintext addresses.
 */
export async function POST(request: Request) {
  // The signature covers the exact bytes, so the body is read as text first
  // and only parsed after verification.
  const rawBody = await request.text();
  const verified = verifyInbound(request.headers, rawBody);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const supabase = createServiceClient();
  const { data: partnership } = await supabase
    .from("platform_federation")
    .select("id, partner_platform_url, shared_audience, shared_analytics, cross_promotion_enabled, status, owner_user_id")
    .eq("api_key_hash", verified.keyHash)
    .maybeSingle();

  if (!partnership) return NextResponse.json({ error: "Unknown federation key." }, { status: 401 });
  if (partnership.status === "paused") return NextResponse.json({ error: "This partnership is paused." }, { status: 403 });

  let parsed: { action?: FederationAction; payload?: Record<string, unknown> };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed body." }, { status: 400 });
  }

  const payload = parsed.payload ?? {};

  switch (parsed.action) {
    case "ping": {
      // First contact doubles as activation: a partnership that has proved it
      // can reach us is no longer merely pending.
      if (partnership.status === "pending") {
        await supabase
          .from("platform_federation")
          .update({ status: "active", last_verified_at: new Date().toISOString() })
          .eq("id", partnership.id);
      } else {
        await supabase.from("platform_federation").update({ last_verified_at: new Date().toISOString() }).eq("id", partnership.id);
      }
      return NextResponse.json({ ok: true, platform: SITE.url, action: "ping" });
    }

    case "audience_share": {
      if (!partnership.shared_audience) {
        return NextResponse.json({ error: "Audience sharing is not enabled for this partnership." }, { status: 403 });
      }

      const emailHashes = Array.isArray(payload.emailHashes) ? (payload.emailHashes as unknown[]) : [];
      const consent = payload.consentGiven !== false;
      if (!consent) return NextResponse.json({ error: "Audience may only be shared with consent." }, { status: 400 });

      const rows = emailHashes
        .filter((value): value is string => typeof value === "string" && /^[a-f0-9]{64}$/i.test(value))
        .slice(0, MAX_AUDIENCE_PER_CALL)
        .map((hash) => ({
          federation_id: partnership.id,
          email_hash: hash.toLowerCase(),
          source_platform: partnership.partner_platform_url,
          consent_given: true,
        }));

      if (rows.length === 0) return NextResponse.json({ error: "No valid SHA-256 email hashes supplied." }, { status: 400 });

      const { error } = await supabase.from("federated_audiences").upsert(rows, { onConflict: "federation_id,email_hash" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ ok: true, accepted: rows.length });
    }

    case "analytics_summary": {
      if (!partnership.shared_analytics) {
        return NextResponse.json({ error: "Analytics sharing is not enabled for this partnership." }, { status: 403 });
      }
      if (!partnership.owner_user_id) return NextResponse.json({ error: "Partnership has no owner." }, { status: 409 });

      // Aggregates only — counts, never a name, email or per-attendee row.
      const { data: webinars } = await supabase
        .from("webinars")
        .select("id, total_views")
        .eq("owner_id", partnership.owner_user_id)
        .eq("status", "published");

      const webinarIds = (webinars ?? []).map((webinar) => webinar.id);
      const { count: registrantCount } = webinarIds.length
        ? await supabase.from("registrants").select("id", { count: "exact", head: true }).in("webinar_id", webinarIds)
        : { count: 0 };

      return NextResponse.json({
        ok: true,
        summary: {
          publishedWebinars: webinarIds.length,
          totalViews: (webinars ?? []).reduce((sum, webinar) => sum + (webinar.total_views ?? 0), 0),
          totalRegistrants: registrantCount ?? 0,
        },
      });
    }

    default:
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }
}

/** Exposed so a partner can confirm the hashing scheme this side expects for audience sharing. */
export function GET() {
  return NextResponse.json({
    platform: SITE.url,
    protocol: "loopinglive-federation/1",
    audienceHash: "sha256(lowercased trimmed email)",
    actions: ["ping", "audience_share", "analytics_summary"],
    example: createHash("sha256").update("someone@example.com").digest("hex"),
  });
}
