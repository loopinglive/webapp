/**
 * The role vocabulary, with no server dependencies.
 *
 * Split from `admin-roles.ts` because that file is `server-only` — it reads the
 * session — while the labels and the capability matrix are also needed by the
 * admin screens to decide which controls to render.
 */

export type AdminRole = "owner" | "support" | "finance";

export type Capability =
  | "view_customers"
  | "edit_customers"
  | "impersonate"
  | "suspend"
  | "grant_plans"
  | "billing_actions"
  | "view_revenue"
  | "broadcast"
  | "manage_admins"
  | "platform_config";

export const CAPABILITIES: Record<AdminRole, Capability[]> = {
  owner: [
    "view_customers",
    "edit_customers",
    "impersonate",
    "suspend",
    "grant_plans",
    "billing_actions",
    "view_revenue",
    "broadcast",
    "manage_admins",
    "platform_config",
  ],
  // Answers tickets. Can see and fix an account, cannot touch money.
  support: ["view_customers", "edit_customers", "impersonate", "suspend"],
  // Handles money. Has no business inside someone's dashboard.
  finance: ["view_customers", "billing_actions", "view_revenue", "grant_plans"],
};

export const ROLES: AdminRole[] = ["owner", "support", "finance"];

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  support: "Support",
  finance: "Finance",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  owner: "Everything, including granting roles to others.",
  support: "Read and fix accounts, impersonate, suspend. No money, no roles.",
  finance: "Billing, refunds and revenue. Cannot impersonate.",
};

export function roleCan(role: AdminRole | null | undefined, capability: Capability) {
  if (!role) return false;
  return (CAPABILITIES[role] ?? []).includes(capability);
}
