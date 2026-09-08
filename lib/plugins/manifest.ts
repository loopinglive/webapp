import { z } from "zod";

/**
 * What a plugin can ask to touch — enforced server-side at event-dispatch
 * time (lib/plugins/dispatch.ts), not just declared for show. A plugin that
 * never requested `chat:messages:write` never gets an event payload it could
 * use to write one, regardless of what its own code tries to do.
 */
export const PLUGIN_PERMISSIONS = [
  "webinar:events:read",
  "chat:messages:write",
  "ui:overlay:show",
  "registration:fields:read",
  "analytics:read",
] as const;

export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

/** Every moment a plugin can subscribe to. */
export const PLUGIN_EVENTS = [
  "session.started",
  "session.ended",
  "registrant.joined",
  "registrant.left",
  "chat.message.sent",
  "offer.clicked",
  "offer.purchased",
  "poll.started",
  "poll.ended",
  "video.milestone",
] as const;

export type PluginEventType = (typeof PLUGIN_EVENTS)[number];

export const PLUGIN_CATEGORIES = [
  "engagement",
  "analytics",
  "integrations",
  "automation",
  "design",
  "utilities",
] as const;

const settingFieldSchema = z.object({
  type: z.enum(["string", "number", "boolean", "select", "multiselect"]),
  label: z.string(),
  default: z.unknown().optional(),
  options: z.array(z.string()).optional(),
});

export const pluginManifestSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Lowercase letters, numbers, and hyphens only."),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Use semver, e.g. 1.0.0."),
  description: z.string().min(1).max(500),
  category: z.enum(PLUGIN_CATEGORIES),
  permissions: z.array(z.enum(PLUGIN_PERMISSIONS)).default([]),
  hooks: z
    .array(z.object({ event: z.enum(PLUGIN_EVENTS), handler: z.string() }))
    .default([]),
  settings_schema: z.record(z.string(), settingFieldSchema).default({}),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;

/** True only if every event the manifest hooks into is covered by a declared permission. */
export function manifestRequestsOnlyDeclaredAccess(manifest: PluginManifest): boolean {
  const needsEventRead = manifest.hooks.length > 0;
  if (needsEventRead && !manifest.permissions.includes("webinar:events:read")) return false;
  return true;
}
