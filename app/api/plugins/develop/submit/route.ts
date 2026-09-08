import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { manifestRequestsOnlyDeclaredAccess, pluginManifestSchema } from "@/lib/plugins/manifest";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess } from "@/lib/webinar-access";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

/** A developer's own submitted plugins — approved and pending both. */
export async function GET() {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("plugins")
    .select("id, name, slug, version, category, is_approved, is_active, install_count, created_at")
    .eq("developer_id", access.actorId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plugins: data ?? [] });
}

/** Submits a new plugin (or a new version of one already owned) for review. */
export async function POST(request: Request) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const body = (await request.json().catch(() => ({}))) as {
    manifest?: unknown;
    bundleUrl?: string;
    iconUrl?: string;
    screenshots?: string[];
    pricingType?: "free" | "paid";
    price?: number;
  };

  const manifestParsed = pluginManifestSchema.safeParse(body.manifest);
  if (!manifestParsed.success) {
    return NextResponse.json({ error: manifestParsed.error.issues[0]?.message ?? "Invalid manifest" }, { status: 422 });
  }
  if (!manifestRequestsOnlyDeclaredAccess(manifestParsed.data)) {
    return NextResponse.json(
      { error: "The manifest hooks into an event without declaring webinar:events:read." },
      { status: 422 }
    );
  }
  if (!body.bundleUrl || !/^https:\/\//.test(body.bundleUrl)) {
    return NextResponse.json({ error: "A bundleUrl (https://) is required." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("plugins")
    .select("id, developer_id")
    .eq("slug", manifestParsed.data.slug)
    .maybeSingle();

  if (existing && existing.developer_id !== access.actorId) {
    return NextResponse.json({ error: "That slug is already taken by another developer." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("plugins")
    .upsert(
      {
        developer_id: access.actorId,
        name: manifestParsed.data.name,
        slug: manifestParsed.data.slug,
        description: manifestParsed.data.description,
        version: manifestParsed.data.version,
        category: manifestParsed.data.category,
        manifest: manifestParsed.data as unknown as Json,
        bundle_url: body.bundleUrl,
        icon_url: body.iconUrl ?? null,
        screenshots: body.screenshots ?? [],
        pricing_type: body.pricingType ?? "free",
        price: body.price ?? 0,
        // Re-submission always resets review — a changed bundle is a
        // changed plugin, and the old approval was for the old code.
        is_approved: false,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    action: "plugin.submitted",
    resourceType: "plugin",
    resourceId: data.id,
    userId: access.isPlatformAdmin ? null : access.actorId,
    newValue: { slug: manifestParsed.data.slug, version: manifestParsed.data.version },
    request,
  });

  return NextResponse.json({ pluginId: data.id, status: "pending_review" });
}
