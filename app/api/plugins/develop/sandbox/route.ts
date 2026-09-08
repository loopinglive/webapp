import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

/**
 * What the developer sandbox needs to load a plugin for testing — the
 * developer's own plugin, at any review status, since testing before
 * approval is the entire point of a sandbox.
 */
export async function GET(request: Request) {
  const pluginId = new URL(request.url).searchParams.get("pluginId");
  if (!pluginId) return NextResponse.json({ error: "pluginId is required" }, { status: 400 });

  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data: plugin } = await supabase
    .from("plugins")
    .select("id, name, bundle_url, manifest, developer_id")
    .eq("id", pluginId)
    .maybeSingle();

  if (!plugin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!access.isPlatformAdmin && plugin.developer_id !== access.actorId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  return NextResponse.json({
    name: plugin.name,
    bundleUrl: plugin.bundle_url,
    manifest: plugin.manifest,
  });
}
