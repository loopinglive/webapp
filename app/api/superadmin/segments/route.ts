import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/billing/account";
import { renderEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/messaging/providers";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** The filters a segment may use. Named, not raw SQL. */
const filterSchema = z.object({
  plan: z.array(z.enum(["free", "monthly", "yearly", "lifetime"])).optional(),
  hasWebinar: z.boolean().optional(),
  hasPublished: z.boolean().optional(),
  hasPaid: z.boolean().optional(),
  signedUpWithinDays: z.number().int().min(1).max(3650).optional(),
  inactiveForDays: z.number().int().min(1).max(3650).optional(),
});

export async function GET(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createServiceClient();
  const preview = new URL(request.url).searchParams.get("preview");

  // Ad-hoc preview: count an unsaved filter before committing to it.
  if (preview) {
    try {
      const filters = filterSchema.parse(JSON.parse(preview));
      const { data } = await supabase.rpc("resolve_segment", {
        p_filters: filters as Json,
      });
      return NextResponse.json({
        count: data?.length ?? 0,
        sample: (data ?? []).slice(0, 5).map((row) => row.email),
      });
    } catch {
      return NextResponse.json({ error: "Invalid filters." }, { status: 422 });
    }
  }

  const [{ data: segments }, { data: broadcasts }] = await Promise.all([
    supabase.from("saved_segments").select("*").order("created_at", { ascending: false }),
    supabase
      .from("broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // Live counts, so a segment saved last month is not quoted at last month's size.
  const withCounts = await Promise.all(
    (segments ?? []).map(async (segment) => {
      const { data } = await supabase.rpc("resolve_segment", {
        p_filters: segment.filters,
      });
      return { ...segment, count: data?.length ?? 0 };
    })
  );

  return NextResponse.json({ segments: withCounts, broadcasts: broadcasts ?? [] });
}

const saveSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  description: z.string().max(300).optional(),
  filters: filterSchema,
});

export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const parsed = saveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Give the segment a name and at least one filter." },
      { status: 422 }
    );
  }

  const { data, error } = await createServiceClient()
    .from("saved_segments")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      filters: parsed.data.filters as Json,
      created_by: admin.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ segment: data });
}

const broadcastSchema = z.object({
  segmentId: z.string().uuid().optional(),
  filters: filterSchema,
  subject: z.string().min(1).max(200).trim(),
  body: z.string().min(1).max(10_000),
  confirm: z.literal(true),
});

/**
 * Sends to a segment.
 *
 * `confirm` is required in the body rather than handled only by a dialog: this
 * is the one endpoint in the product that emails hundreds of people, and it
 * should not be reachable by accident from a mistyped fetch.
 *
 * Sends serially with a small pause. Resend rate-limits, and a burst that gets
 * half the audience throttled is worse than a send that takes a minute longer.
 */
export async function PUT(request: Request) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const parsed = broadcastSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A subject, a body and an explicit confirmation are required." },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();

  const { data: audience } = await supabase.rpc("resolve_segment", {
    p_filters: parsed.data.filters as Json,
  });

  const recipients = audience ?? [];
  if (recipients.length === 0) {
    return NextResponse.json({ error: "That segment is empty." }, { status: 400 });
  }

  // Recorded before sending, so a crash halfway leaves evidence of what was
  // attempted rather than an unexplained partial send.
  const { data: broadcast } = await supabase
    .from("broadcasts")
    .insert({
      segment_id: parsed.data.segmentId ?? null,
      filters: parsed.data.filters as Json,
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: "sending",
      recipient_count: recipients.length,
      created_by: admin.id,
    })
    .select("id")
    .single();

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const firstName = (recipient.full_name || "there").split(" ")[0];

    const html = renderEmail({
      heading: parsed.data.subject,
      body: parsed.data.body.replace(/\{\{\s*name\s*\}\}/g, firstName),
      brandName: "Loopinglive",
      // A broadcast is marketing, not a service message, so it carries a way
      // out. The link is the account's own settings rather than a one-click
      // token, because these are customers and not a mailing list.
      unsubscribeLink: `${SITE.url}/settings`,
      footerNote: `You are receiving this as a ${recipient.plan_slug} customer of Loopinglive.`,
    });

    const result = await sendEmail({
      to: recipient.email,
      fromName: "Loopinglive",
      fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
      subject: parsed.data.subject,
      html,
      text: parsed.data.body.replace(/\{\{\s*name\s*\}\}/g, firstName),
    });

    if (result.ok) sent += 1;
    else failed += 1;

    // Paced rather than fired in parallel: being throttled halfway through is
    // worse than taking a minute longer.
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  await supabase
    .from("broadcasts")
    .update({
      status: failed === recipients.length ? "failed" : "sent",
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    })
    .eq("id", broadcast!.id);

  await supabase.from("admin_actions").insert({
    admin_id: admin.id,
    action: "broadcast_sent",
    detail: { subject: parsed.data.subject, sent, failed } as never,
  });

  return NextResponse.json({ sent, failed, total: recipients.length });
}
