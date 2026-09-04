/**
 * The team role vocabulary, with no server dependencies.
 *
 * Split from the auth gate the same way super-admin roles are: this file is
 * imported by client components that need to know what a role can do, so it
 * cannot pull in anything that reads the session.
 */

export type TeamRole = "owner" | "admin" | "editor" | "viewer";

export type TeamCapability =
  | "manage_billing"
  | "manage_members"
  | "delete_team"
  | "create_webinars"
  | "delete_webinars"
  | "view_all_webinars"
  | "view_all_attendees"
  | "export_attendees"
  | "manage_automation"
  | "access_live_panel"
  | "manage_integrations"
  | "view_analytics"
  | "manage_personas";

const CAPABILITIES: Record<TeamRole, TeamCapability[]> = {
  owner: [
    "manage_billing",
    "manage_members",
    "delete_team",
    "create_webinars",
    "delete_webinars",
    "view_all_webinars",
    "view_all_attendees",
    "export_attendees",
    "manage_automation",
    "access_live_panel",
    "manage_integrations",
    "view_analytics",
    "manage_personas",
  ],
  admin: [
    "create_webinars",
    "delete_webinars",
    "view_all_webinars",
    "view_all_attendees",
    "export_attendees",
    "manage_automation",
    "access_live_panel",
    "manage_integrations",
    "view_analytics",
    "manage_personas",
  ],
  // Own webinars only — enforced by ownership checks in each route, not by
  // this matrix. The matrix says what the role can do in principle; the
  // route decides whether this particular webinar is theirs to do it to.
  editor: [
    "create_webinars",
    "view_analytics",
    "manage_personas",
    "access_live_panel",
  ],
  viewer: ["view_analytics", "view_all_webinars"],
};

export const ROLES: TeamRole[] = ["owner", "admin", "editor", "viewer"];

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export const TEAM_ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Everything, including billing and removing the team.",
  admin: "Every webinar on the team. No billing, no removing members.",
  editor: "Their own webinars only. Cannot see what teammates are running.",
  viewer: "Read-only. Cannot create or change anything.",
};

export function teamRoleCan(
  role: TeamRole | null | undefined,
  capability: TeamCapability
) {
  if (!role) return false;
  return (CAPABILITIES[role] ?? []).includes(capability);
}
