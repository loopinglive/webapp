import type { PluginEventType, PluginPermission } from "@/lib/plugins/manifest";

/**
 * The PostMessage protocol between the host page and a plugin's sandboxed
 * iframe. Plugins never get direct access to the parent window — this
 * envelope, and only this envelope, is what crosses the boundary.
 */

export const BRIDGE_NAMESPACE = "loopinglive-plugin";

export type HostToPluginMessage =
  | { ns: typeof BRIDGE_NAMESPACE; type: "init"; webinarId: string; permissions: PluginPermission[]; settings: Record<string, unknown> }
  | { ns: typeof BRIDGE_NAMESPACE; type: "event"; event: PluginEventType; payload: unknown };

export type PluginToHostMessage =
  | { ns: typeof BRIDGE_NAMESPACE; type: "ready" }
  | { ns: typeof BRIDGE_NAMESPACE; type: "action"; action: "chat:send"; payload: { message: string } }
  | { ns: typeof BRIDGE_NAMESPACE; type: "action"; action: "overlay:show"; payload: { html: string; durationMs?: number } }
  | { ns: typeof BRIDGE_NAMESPACE; type: "action"; action: "overlay:hide"; payload?: undefined }
  | { ns: typeof BRIDGE_NAMESPACE; type: "log"; level: "info" | "warn" | "error"; message: string };

export function isPluginToHostMessage(data: unknown): data is PluginToHostMessage {
  return Boolean(data) && typeof data === "object" && (data as { ns?: unknown }).ns === BRIDGE_NAMESPACE;
}

/** The action a permission gates — used both to filter what a plugin receives and what it may do. */
export const ACTION_PERMISSION: Record<string, PluginPermission> = {
  "chat:send": "chat:messages:write",
  "overlay:show": "ui:overlay:show",
  "overlay:hide": "ui:overlay:show",
};
