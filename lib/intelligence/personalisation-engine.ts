import "server-only";

import {
  findMatchingRule,
  type Condition,
  type PersonalisationAction,
  type PersonalisationContext,
} from "@/lib/intelligence/personalisation";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

type Client = ReturnType<typeof createServiceClient>;

export async function buildContext(
  supabase: Client,
  registrantId: string
): Promise<PersonalisationContext | null> {
  const { data: registrant } = await supabase
    .from("registrants")
    .select("device_type, country_code, returning_attendee, watch_percentage, clicked_offer")
    .eq("id", registrantId)
    .maybeSingle();

  if (!registrant) return null;

  const { data: source } = await supabase
    .from("attendee_sources")
    .select("utm_source")
    .eq("registrant_id", registrantId)
    .maybeSingle();

  return {
    deviceType: registrant.device_type,
    countryCode: registrant.country_code,
    returningAttendee: registrant.returning_attendee ?? false,
    watchPercentage: registrant.watch_percentage ?? 0,
    clickedOffer: registrant.clicked_offer ?? false,
    utmSource: source?.utm_source ?? null,
  };
}

export type MatchedRule = {
  ruleId: string;
  ruleName: string;
  actions: PersonalisationAction[];
} | null;

/**
 * Evaluates a webinar's active rules against one registrant and logs the
 * outcome. Consumed via `/api/webinar/[webinarId]/personalise` — this
 * platform's rendering surfaces (the registration and watch-room pages)
 * are not wired to call it yet, so a rule created here does not change what
 * anyone sees until a specific page is built to ask for its match. That
 * wiring is deliberately left for when those pages are next touched, rather
 * than edited here as a drive-by change to code this feature did not build.
 */
export async function evaluateRulesForRegistrant(
  supabase: Client,
  webinarId: string,
  registrantId: string,
  sessionId: string | null
): Promise<MatchedRule> {
  const context = await buildContext(supabase, registrantId);
  if (!context) return null;

  const { data: rules } = await supabase
    .from("personalisation_rules")
    .select("id, rule_name, conditions, actions, priority")
    .eq("webinar_id", webinarId)
    .eq("is_active", true);

  if (!rules || rules.length === 0) return null;

  const candidates = rules.map((rule) => ({
    id: rule.id,
    conditions: (rule.conditions as unknown as Condition[]) ?? [],
    actions: (rule.actions as unknown as PersonalisationAction[]) ?? [],
    priority: rule.priority,
  }));

  const matched = findMatchingRule(candidates, context);

  await supabase.from("personalisation_events").insert({
    registrant_id: registrantId,
    session_id: sessionId,
    rule_id: matched?.id ?? null,
    event_type: matched ? "rule_matched" : "no_match",
    data: { context } as unknown as Json,
  });

  if (!matched) return null;

  const source = rules.find((rule) => rule.id === matched.id);
  return {
    ruleId: matched.id,
    ruleName: source?.rule_name ?? "",
    actions: matched.actions,
  };
}
