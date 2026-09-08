import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { installationId } = (await request.json().catch(() => ({}))) as { installationId?: string };
  if (!installationId) return NextResponse.json({ error: "installationId is required" }, { status: 400 });

  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  const { data: installation } = await supabase
    .from("plugin_installations")
    .select("id, user_id")
    .eq("id", installationId)
    .maybeSingle();

  if (!installation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!access.isPlatformAdmin && installation.user_id !== access.actorId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  await supabase.from("plugin_installations").delete().eq("id", installationId);

  await logAudit({
    action: "plugin.uninstalled",
    resourceType: "plugin_installation",
    resourceId: installationId,
    userId: access.isPlatformAdmin ? null : access.actorId,
    request,
  });

  return NextResponse.json({ success: true });
}
