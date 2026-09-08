import "server-only";

import type { PluginEventType } from "@/lib/plugins/manifest";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * Records that a webinar event fired, for every plugin installed on it that
 * declared a hook for this event type.
 *
 * This is the durable event log a real-time delivery layer would read from —
 * it is not that layer itself. An installed plugin's sandboxed iframe only
 * ever receives simulated events today, from components/plugins/PluginSandbox
 * during development; wiring plugin_events into the live admin panel so an
 * installed plugin gets pushed a real event during a real session is a
 * separate piece of work this pass does not do. Fire-and-forget by design —
 * the webinar action a plugin might react to must never wait on this.
 */
export function dispatchPluginEventInBackground(
  webinarId: string,
  eventType: PluginEventType,
  payload: Record<string, unknown>
): void {
  void dispatchPluginEvent(webinarId, eventType, payload).catch(() => {
    // Deliberately swallowed — see the note above.
  });
}

async function dispatchPluginEvent(
  webinarId: string,
  eventType: PluginEventType,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient();

  const { data: installations } = await supabase
    .from("plugin_installations")
    .select("id, plugin_id, plugin:plugins(manifest, is_active, is_approved)")
    .eq("webinar_id", webinarId)
    .eq("is_active", true);

  if (!installations?.length) return;

  const rows = installations
    .filter((installation) => {
      const plugin = installation.plugin as unknown as {
        manifest: { hooks?: Array<{ event: string }> };
        is_active: boolean;
        is_approved: boolean;
      } | null;
      if (!plugin?.is_active || !plugin.is_approved) return false;
      return (plugin.manifest?.hooks ?? []).some((hook) => hook.event === eventType);
    })
    .map((installation) => ({
      plugin_id: installation.plugin_id,
      installation_id: installation.id,
      event_type: eventType,
      payload: payload as Json,
      status: "pending" as const,
    }));

  if (rows.length === 0) return;

  await supabase.from("plugin_events").insert(rows);
}
