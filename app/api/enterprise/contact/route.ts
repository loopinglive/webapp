import { NextResponse } from "next/server";
import { z } from "zod";

import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/messaging/providers";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  companyName: z.string().min(1).max(160).trim(),
  fullName: z.string().min(1).max(160).trim(),
  workEmail: z.string().email().toLowerCase(),
  phone: z.string().max(40).trim().optional(),
  teamSize: z.string().max(40).optional(),
  monthlySessions: z.string().max(40).optional(),
  currentPlatform: z.string().max(160).trim().optional(),
  message: z.string().max(3000).trim().optional(),
});

/** "Request a Demo" — a public, unauthenticated form, so it is rate-limited like registration. */
export async function POST(request: Request) {
  const limit = rateLimit(`enterprise-contact:${clientIp(request)}`, {
    limit: 3,
    windowSeconds: 3600,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A company name, your name and a work email are required." },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("enterprise_leads").insert({
    company_name: parsed.data.companyName,
    full_name: parsed.data.fullName,
    work_email: parsed.data.workEmail,
    phone: parsed.data.phone || null,
    team_size: parsed.data.teamSize || null,
    monthly_sessions: parsed.data.monthlySessions || null,
    current_platform: parsed.data.currentPlatform || null,
    message: parsed.data.message || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort — a lead that saved but did not email anyone is still a lead
  // sitting in the queue, not a lost one.
  if (ADMIN_EMAIL) {
    await sendEmail({
      to: ADMIN_EMAIL,
      fromName: "Loopinglive",
      fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
      subject: `Enterprise demo request — ${parsed.data.companyName}`,
      text: [
        `${parsed.data.fullName} at ${parsed.data.companyName} (${parsed.data.workEmail})`,
        parsed.data.phone && `Phone: ${parsed.data.phone}`,
        parsed.data.teamSize && `Team size: ${parsed.data.teamSize}`,
        parsed.data.monthlySessions && `Monthly sessions: ${parsed.data.monthlySessions}`,
        parsed.data.currentPlatform && `Currently using: ${parsed.data.currentPlatform}`,
        parsed.data.message && `\n${parsed.data.message}`,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `<p>${parsed.data.fullName} at ${parsed.data.companyName} (${parsed.data.workEmail})</p>`,
    }).catch(() => undefined);
  }

  return NextResponse.json({ success: true });
}
