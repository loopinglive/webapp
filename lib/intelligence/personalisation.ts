/**
 * Rule-based personalisation — pure evaluation, no database access.
 *
 * A rule is a flat list of conditions (implicit AND) plus a list of actions
 * to take when every condition passes. No nested boolean groups — a host
 * picking "device is mobile AND source is facebook" needs exactly this, and
 * a nested any/all tree is a lot of UI for a case that has not come up.
 */

export type ConditionField =
  | "deviceType"
  | "countryCode"
  | "returningAttendee"
  | "watchPercentage"
  | "clickedOffer"
  | "utmSource";

export type ConditionOperator = "equals" | "not_equals" | "greater_than" | "less_than" | "contains";

export type Condition = {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | boolean;
};

export type PersonalisationAction = {
  type: "custom_message" | "alternate_headline" | "tag_segment";
  value: string;
};

export type PersonalisationContext = {
  deviceType: string | null;
  countryCode: string | null;
  returningAttendee: boolean;
  watchPercentage: number;
  clickedOffer: boolean;
  utmSource: string | null;
};

function evaluateCondition(condition: Condition, context: PersonalisationContext): boolean {
  const actual = context[condition.field];
  if (actual === null || actual === undefined) return false;

  switch (condition.operator) {
    case "equals":
      return String(actual).toLowerCase() === String(condition.value).toLowerCase();
    case "not_equals":
      return String(actual).toLowerCase() !== String(condition.value).toLowerCase();
    case "greater_than":
      return Number(actual) > Number(condition.value);
    case "less_than":
      return Number(actual) < Number(condition.value);
    case "contains":
      return String(actual).toLowerCase().includes(String(condition.value).toLowerCase());
    default:
      return false;
  }
}

/** True only if every condition passes — an empty list matches everyone, so a rule with no conditions is a catch-all by design, not a bug. */
export function evaluateConditions(conditions: Condition[], context: PersonalisationContext): boolean {
  return conditions.every((condition) => evaluateCondition(condition, context));
}

export type RuleLike = {
  id: string;
  conditions: Condition[];
  actions: PersonalisationAction[];
  priority: number;
};

/** Highest-priority matching rule wins — rules are not combined, so overlapping rules must be an intentional priority order, not a merge. */
export function findMatchingRule(rules: RuleLike[], context: PersonalisationContext): RuleLike | null {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (evaluateConditions(rule.conditions, context)) return rule;
  }
  return null;
}
