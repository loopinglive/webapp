import { NextResponse } from "next/server";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess, requireWebinarAccess } from "@/lib/webinar-access";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

/** The caller's own installed plugins, across their whole account. */
export async function GET() {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("plugin_installations")
    .select("id, plugin_id, webinar_id, settings, is_active, installed_at, plugin:plugins(name, slug, icon_url, category, manifest)")
    .eq("user_id", access.actorId)
    .order("installed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ installations: data ?? [] });
}

const schema = z.object({
  pluginId: z.string().uuid(),
  webinarId: z.string().uuid().optional(),
  settings: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const access = parsed.data.webinarId
    ? await requireWebinarAccess(parsed.data.webinarId)
    : await requireAccountAccess();
  if (!access.ok) return access.response;

  const supabase = createServiceClient();

  const { data: plugin } = await supabase
    .from("plugins")
    .select("id, name, pricing_type, is_approved, is_active")
    .eq("id", parsed.data.pluginId)
    .maybeSingle();

  if (!plugin || !plugin.is_approved || !plugin.is_active) {
    return NextResponse.json({ error: "That plugin is not available." }, { status: 404 });
  }

  // Stripe Connect payouts for paid plugins are not wired up yet — refusing
  // to install one for free is the honest failure mode, not silently
  // granting access to something meant to be paid.
  if (plugin.pricing_type !== "free") {
    return NextResponse.json(
      { error: "Paid plugin checkout is not yet available on this deployment." },
      { status: 501 }
    );
  }

  const { data, error } = await supabase
    .from("plugin_installations")
    .upsert(
      {
        plugin_id: parsed.data.pluginId,
        user_id: access.actorId,
        webinar_id: parsed.data.webinarId ?? null,
        settings: parsed.data.settings as Json,
        is_active: true,
      },
      { onConflict: "plugin_id,user_id,webinar_id" }
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: current } = await supabase
    .from("plugins")
    .select("install_count")
    .eq("id", parsed.data.pluginId)
    .maybeSingle();
  await supabase
    .from("plugins")
    .update({ install_count: (current?.install_count ?? 0) + 1 })
    .eq("id", parsed.data.pluginId);

  await logAudit({
    action: "plugin.installed",
    resourceType: "plugin_installation",
    resourceId: data.id,
    userId: access.isPlatformAdmin ? null : access.actorId,
    newValue: { pluginId: parsed.data.pluginId, webinarId: parsed.data.webinarId ?? null },
    request,
  });

  return NextResponse.json({ installationId: data.id });
}

const settingsSchema = z.object({
  installationId: z.string().uuid(),
  settings: z.record(z.string(), z.unknown()),
});

/** Updates one installation's per-plugin settings. */
export async function PATCH(request: Request) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const parsed = settingsSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data: installation } = await supabase
    .from("plugin_installations")
    .select("id, user_id")
    .eq("id", parsed.data.installationId)
    .maybeSingle();

  if (!installation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!access.isPlatformAdmin && installation.user_id !== access.actorId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { error } = await supabase
    .from("plugin_installations")
    .update({ settings: parsed.data.settings as Json })
    .eq("id", parsed.data.installationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
