import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * What people in rooms have told us is wrong.
 *
 * Gated on suspend rather than a capability of its own: everything you can do
 * about a report — take the webinar down, suspend the account — is already
 * that permission, and a queue you can read but never act on is a way to feel
 * informed rather than a way to fix anything.
 */
export async function GET(request: Request) {
  const { response: denied } = await requireCapability("suspend");
  if (denied) return denied;

  const status = new URL(request.url).searchParams.get("status") ?? "open";

  const { data, error } = await createServiceClient().rpc("report_queue", {
    p_status: status,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

const schema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["dismiss", "action"]),
  resolution: z.string().max(1000).trim().optional(),
  /** Take the webinar offline as part of resolving this. */
  unpublish: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireCapability("suspend");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: report } = await supabase
    .from("content_reports")
    .select("id, webinar_id, status")
    .eq("id", parsed.data.reportId)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: "No such report." }, { status: 404 });
  }

  await supabase
    .from("content_reports")
    .update({
      status: parsed.data.action === "action" ? "actioned" : "dismissed",
      resolution: parsed.data.resolution ?? null,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", report.id);

  if (parsed.data.unpublish && report.webinar_id) {
    await supabase
      .from("webinars")
      .update({ is_active: false, status: "draft" })
      .eq("id", report.webinar_id);

    /*
     * Every other open report on the same webinar is now answered too.
     *
     * Leaving them would mean the next reviewer reads a queue of complaints
     * about something already taken down, and either repeats the work or
     * learns to skim.
     */
    await supabase
      .from("content_reports")
      .update({
        status: "actioned",
        resolution: "Resolved with another report on the same webinar.",
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("webinar_id", report.webinar_id)
      .eq("status", "open");
  }

  await supabase.from("admin_actions").insert({
    admin_id: admin.id,
    action: `report_${parsed.data.action}ed`,
    detail: {
      reportId: report.id,
      webinarId: report.webinar_id,
      unpublished: Boolean(parsed.data.unpublish),
    } as never,
  });

  return NextResponse.json({ success: true });
}
