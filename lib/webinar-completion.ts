import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Service = SupabaseClient<Database>;

/**
 * Everything that should happen the moment someone crosses "watched it":
 * unlock the next item in a series, mint a certificate, and flag them for an
 * upsell follow-up.
 *
 * Called once, from the attendance route's 90% crossing — never from a
 * polling job, so none of this depends on a tick interval to notice someone
 * finished.
 */
export async function handleWebinarCompletion(
  supabase: Service,
  params: {
    webinarId: string;
    registrantId: string;
    sessionId: string | null;
    watchPercentage: number;
  }
) {
  const { data: webinar } = await supabase
    .from("webinars")
    .select(
      "id, owner_id, title, series_id, certificate_enabled, certificate_min_watch_percentage, certificate_template_id"
    )
    .eq("id", params.webinarId)
    .maybeSingle();

  if (!webinar) return;

  const { data: registrant } = await supabase
    .from("registrants")
    .select("id, full_name, email")
    .eq("id", params.registrantId)
    .maybeSingle();

  if (!registrant) return;

  await Promise.all([
    maybeIssueCertificate(supabase, webinar, registrant, params.watchPercentage),
    maybeAdvanceSeries(supabase, webinar, registrant),
    markUpsellEligible(supabase, params.registrantId, webinar.id),
  ]);
}

async function maybeIssueCertificate(
  supabase: Service,
  webinar: {
    id: string;
    owner_id: string | null;
    title: string;
    certificate_enabled: boolean;
    certificate_min_watch_percentage: number;
    certificate_template_id: string | null;
  },
  registrant: { id: string; full_name: string; email: string },
  watchPercentage: number
) {
  if (!webinar.certificate_enabled) return;
  if (watchPercentage < webinar.certificate_min_watch_percentage) return;

  const { data: existing } = await supabase
    .from("certificates")
    .select("id")
    .eq("webinar_id", webinar.id)
    .eq("registrant_id", registrant.id)
    .maybeSingle();
  if (existing) return;

  const certificateNumber = `LL-${webinar.id.slice(0, 8).toUpperCase()}-${registrant.id.slice(0, 8).toUpperCase()}`;

  // The recipient's name, their email, and the webinar's title are not
  // stored on the row itself -- they are read live off `registrants` and
  // `webinars` wherever a certificate is rendered, so a later name change
  // or webinar rename is reflected rather than frozen at issue time.
  await supabase.from("certificates").insert({
    webinar_id: webinar.id,
    registrant_id: registrant.id,
    template_id: webinar.certificate_template_id ?? "default",
    certificate_number: certificateNumber,
    issued_at: new Date().toISOString(),
  });
}

/**
 * A series' progress lives keyed on webinar id, not position — a position
 * only exists as long as the host hasn't reordered the series, and using it
 * as the durable "what has this person completed" record would silently
 * corrupt everyone's progress the moment an item moves.
 */
async function maybeAdvanceSeries(
  supabase: Service,
  webinar: { id: string; series_id: string | null },
  registrant: { id: string; email: string }
) {
  if (!webinar.series_id) return;

  const { data: item } = await supabase
    .from("webinar_series_items")
    .select("position")
    .eq("series_id", webinar.series_id)
    .eq("webinar_id", webinar.id)
    .maybeSingle();
  if (!item) return;

  const { data: progress } = await supabase
    .from("series_progress")
    .select("id, current_webinar_id, completed_webinar_ids")
    .eq("series_id", webinar.series_id)
    .eq("registrant_email", registrant.email)
    .maybeSingle();
  if (!progress) return;

  const completed = new Set<string>((progress.completed_webinar_ids as string[]) ?? []);
  completed.add(webinar.id);

  const { data: nextItem } = await supabase
    .from("webinar_series_items")
    .select("webinar_id, position")
    .eq("series_id", webinar.series_id)
    .gt("position", item.position)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("series_progress")
    .update({
      completed_webinar_ids: Array.from(completed),
      current_webinar_id: nextItem ? nextItem.webinar_id : progress.current_webinar_id,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", progress.id);
}

/**
 * Only if a live upsell sequence targets this webinar as its source. This
 * marks eligibility and stamps the moment the cron counts `delay_days` from
 * -- it is not a purchase. `upsell_bought_at` belongs to whatever records
 * the actual sale of the target webinar's offer, not this crossing.
 */
async function markUpsellEligible(supabase: Service, registrantId: string, webinarId: string) {
  const { data: sequence } = await supabase
    .from("upsell_sequences")
    .select("id, target_webinar_id")
    .eq("source_webinar_id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  if (!sequence) return;

  await supabase
    .from("registrants")
    .update({
      upsell_eligible: true,
      upsell_eligible_at: new Date().toISOString(),
      upsell_source_webinar_id: webinarId,
      upsell_webinar_id: sequence.target_webinar_id,
    })
    .eq("id", registrantId);
}
