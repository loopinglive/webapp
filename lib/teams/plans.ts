/**
 * Team plans — deliberately not part of `lib/billing/plans.ts`'s `PlanSlug`
 * union. That type threads through `planPermissions`, environment-variable
 * price lookups, and individual-account billing end to end; folding team
 * plans into it would touch all of that for a feature with a much smaller
 * surface. `teams.plan_slug` is free text instead.
 */

export type TeamPlanId = "team_starter" | "team_pro";

export type TeamPlan = {
  id: TeamPlanId;
  name: string;
  priceCents: number;
  maxMembers: number;
  maxWebinars: number;
  features: string[];
};

export const TEAM_PLANS: TeamPlan[] = [
  {
    id: "team_starter",
    name: "Team Starter",
    priceCents: 19700,
    maxMembers: 5,
    maxWebinars: 20,
    features: [
      "Up to 5 members",
      "20 webinars",
      "Shared analytics",
      "Role-based permissions",
    ],
  },
  {
    id: "team_pro",
    name: "Team Pro",
    priceCents: 39700,
    maxMembers: 15,
    maxWebinars: 0, // 0 = unlimited, matching webinars' own convention
    features: [
      "Up to 15 members",
      "Unlimited webinars",
      "Shared analytics",
      "Role-based permissions",
      "Priority support",
    ],
  },
];

export const TEAM_PLAN_BY_ID = new Map(TEAM_PLANS.map((plan) => [plan.id, plan]));
