import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Reasons, so the queue can be sorted by kind rather than read end to end. */
const REASONS = [
  "misleading_claims",
  "not_live",
  "scam_or_fraud",
  "offensive",
  "impersonation",
  "other",
] as const;

const schema = z.object({
  reason: z.enum(REASONS),
  detail: z.string().max(2000).trim().optional(),
  sessionId: z.string().uuid().optional(),
  registrantId: z.string().uuid().optional(),
});

/**
 * Someone in the room telling us something is wrong.
 *
 * There was no way to do this. Anyone can sign up, upload a video and put it
 * in front of an audience they bring themselves, and the first you would learn
 * of a customer running something you do not want your name on is when someone
 * outside tells you — by which point it has been running for months.
 *
 * Open to anyone who can load the page, including people who never registered.
 * Requiring registration would mean the person best placed to report a scam —
 * someone who saw enough to leave — is the one person who cannot.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;

  // Three an hour. Enough for a genuine report and a correction; not enough to
  // bury a competitor's webinar under a hundred complaints.
  const ip = clientIp(request);
  const limit = rateLimit(`report:${ip}`, { limit: 3, windowSeconds: 3600 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "You have already reported this. We have it." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a reason." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("content_reports").insert({
    webinar_id: webinarId,
    session_id: parsed.data.sessionId ?? null,
    registrant_id: parsed.data.registrantId ?? null,
    reason: parsed.data.reason,
    detail: parsed.data.detail ?? null,
    /*
     * A one-way hash of the address, truncated — not the address.
     *
     * It has to be a real hash: an IPv4 address base64-encoded is still the
     * address, just harder to read. Its only job is noticing the same person
     * filing forty reports, and it is cleared after thirty days — someone
     * reporting a webinar for a false claim should not have that traceable to
     * them a year later.
     */
    reporter_fingerprint: ip
      ? createHash("sha256").update(ip).digest("hex").slice(0, 32)
      : null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
