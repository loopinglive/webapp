import "server-only";

import { linearForecast } from "@/lib/intelligence/forecasting";
import { createServiceClient } from "@/lib/supabase/server";

type Client = ReturnType<typeof createServiceClient>;

const HISTORY_DAYS = 90;

function dateKey(iso: string) {
  return iso.slice(0, 10);
}

function buildDailySeries(dates: string[], days: number): number[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = dateKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const series: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push(counts.get(key) ?? 0);
  }
  return series;
}

function buildDailySums(rows: { date: string; amount: number }[], days: number): number[] {
  const sums = new Map<string, number>();
  for (const row of rows) {
    const key = dateKey(row.date);
    sums.set(key, (sums.get(key) ?? 0) + row.amount);
  }

  const series: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push(sums.get(key) ?? 0);
  }
  return series;
}

/**
 * Forecasts registrants, attendees, conversions and revenue over the next
 * `periodDays`, scoped to one webinar or (webinarId null) every webinar this
 * account owns. Built entirely from this account's own history over the
 * trailing 90 days — a new account with only a few days of data still gets
 * a number back, just one with a wide interval and a low observed-day count
 * the UI can show honestly rather than hide.
 */
export async function generateForecast(
  supabase: Client,
  ownerId: string,
  webinarId: string | null,
  periodDays: number
) {
  const { data: ownedWebinars } = await supabase
    .from("webinars")
    .select("id")
    .eq("owner_id", ownerId);

  const webinarIds = webinarId ? [webinarId] : (ownedWebinars ?? []).map((w) => w.id);

  if (webinarIds.length === 0) {
    throw new Error("No webinars to forecast from.");
  }

  const [{ data: registrants }, { data: purchases }] = await Promise.all([
    supabase
      .from("registrants")
      .select("created_at, attended")
      .in("webinar_id", webinarIds)
      .eq("is_test", false),
    supabase
      .from("purchases")
      .select("created_at, amount_cents")
      .in("webinar_id", webinarIds),
  ]);

  const registeredSeries = buildDailySeries((registrants ?? []).map((r) => r.created_at), HISTORY_DAYS);
  const attendedSeries = buildDailySeries(
    (registrants ?? []).filter((r) => r.attended).map((r) => r.created_at),
    HISTORY_DAYS
  );
  const conversionSeries = buildDailySeries((purchases ?? []).map((p) => p.created_at), HISTORY_DAYS);
  const revenueSeries = buildDailySums(
    (purchases ?? []).map((p) => ({ date: p.created_at, amount: p.amount_cents / 100 })),
    HISTORY_DAYS
  );

  const registeredForecast = linearForecast(registeredSeries, periodDays);
  const attendedForecast = linearForecast(attendedSeries, periodDays);
  const conversionForecast = linearForecast(conversionSeries, periodDays);
  const revenueForecast = linearForecast(revenueSeries, periodDays);

  const { data: row, error } = await supabase
    .from("revenue_forecasts")
    .insert({
      user_id: ownerId,
      webinar_id: webinarId,
      forecast_period: `next_${periodDays}_days`,
      forecast_type: webinarId ? "webinar" : "portfolio",
      predicted_registrants: registeredForecast.predicted,
      predicted_attendees: attendedForecast.predicted,
      predicted_conversions: conversionForecast.predicted,
      predicted_revenue: revenueForecast.predicted,
      confidence_interval_low: revenueForecast.low,
      confidence_interval_high: revenueForecast.high,
      model_version: "linear-regression-v1",
    })
    .select("*")
    .single();

  if (error || !row) throw new Error(error?.message ?? "Could not save forecast.");

  return {
    forecast: row,
    breakdown: {
      registrants: registeredForecast,
      attendees: attendedForecast,
      conversions: conversionForecast,
      revenue: revenueForecast,
    },
  };
}
