import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response: denied } = await requireCapability("view_revenue");
  if (denied) return denied;

  const status = new URL(request.url).searchParams.get("status") ?? "new";
  const { data } = await createServiceClient()
    .from("enterprise_leads")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  return NextResponse.json({ leads: data ?? [] });
}

const schema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "contacted", "converted", "lost"]),
});

export async function PATCH(request: Request) {
  const { response: denied } = await requireCapability("view_revenue");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  await createServiceClient()
    .from("enterprise_leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.leadId);

  return NextResponse.json({ success: true });
}
