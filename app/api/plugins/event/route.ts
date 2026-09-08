import { NextResponse } from "next/server";
import { z } from "zod";

import { PLUGIN_EVENTS } from "@/lib/plugins/manifest";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess } from "@/lib/webinar-access";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

const schema = z.object({
  installationId: z.string().uuid(),
  eventType: z.enum(PLUGIN_EVENTS),
  payload: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Records one event against one installation and marks it delivered.
 *
 * Used by the sandbox (components/plugins/PluginSandbox.tsx) to log a
 * simulated event for the developer's own console, and available for a
 * future real-time delivery layer to call the same way. Ownership-checked so
 * one account cannot puppet another's installation.
 */
export async function POST(request: Request) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const supabase = createServiceClient();

  const { data: installation } = await supabase
    .from("plugin_installations")
    .select("id, user_id, plugin_id")
    .eq("id", parsed.data.installationId)
    .maybeSingle();

  if (!installation) return NextResponse.json({ error: "Installation not found" }, { status: 404 });
  if (!access.isPlatformAdmin && installation.user_id !== access.actorId) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("plugin_events")
    .insert({
      plugin_id: installation.plugin_id,
      installation_id: installation.id,
      event_type: parsed.data.eventType,
      payload: parsed.data.payload as Json,
      status: "delivered",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ eventId: data.id });
}
