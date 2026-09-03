import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Median, for time-to-value. Mean is dragged around by one slow outlier. */
function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const DAY = 86_400_000;

/**
 * Activation and retention.
 *
 * The revenue page says what was billed. This says whether the product is
 * working — where people stop, and how long it takes them to reach value.
 * Both are leading indicators of the numbers on the revenue page.
 */
export async function GET() {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const supabase = createServiceClient();

  const [
    { data: accounts },
    { data: webinars },
    { data: registrants },
    { data: purchases },
    { data: invoices },
    { data: cohorts },
    { data: personas },
    { data: schedules },
    { data: offers },
    { data: integrations },
    { data: aiPersonas },
  ] = await Promise.all([
    supabase.from("user_accounts").select("id, created_at, plan_slug"),
    supabase.from("webinars").select("id, owner_id, created_at, video_url, status"),
    supabase.from("registrants").select("webinar_id, created_at"),
    supabase.from("purchases").select("webinar_id, created_at"),
    supabase.from("invoices").select("user_id, paid_at, status"),
    supabase.rpc("admin_cohort_retention", { p_months: 6 }),
    supabase.from("fake_personas").select("webinar_id"),
    supabase.from("webinar_schedules").select("webinar_id"),
    supabase.from("webinar_offers").select("webinar_id"),
    supabase.from("integrations").select("user_id"),
    supabase.from("ai_personas").select("webinar_id"),
  ]);

  const users = accounts ?? [];
  const allWebinars = webinars ?? [];

  const webinarsByOwner = new Map<string, typeof allWebinars>();
  for (const webinar of allWebinars) {
    if (!webinar.owner_id) continue;
    const list = webinarsByOwner.get(webinar.owner_id) ?? [];
    list.push(webinar);
    webinarsByOwner.set(webinar.owner_id, list);
  }

  const ownerOf = new Map(allWebinars.map((w) => [w.id, w.owner_id]));

  const withRegistrants = new Set<string>();
  const firstRegistrationAt = new Map<string, string>();
  for (const registrant of registrants ?? []) {
    const owner = ownerOf.get(registrant.webinar_id);
    if (!owner) continue;
    withRegistrants.add(owner);
    const current = firstRegistrationAt.get(owner);
    if (!current || registrant.created_at < current) {
      firstRegistrationAt.set(owner, registrant.created_at);
    }
  }

  const withSales = new Set<string>();
  for (const purchase of purchases ?? []) {
    const owner = ownerOf.get(purchase.webinar_id);
    if (owner) withSales.add(owner);
  }

  const paidUsers = new Set(
    (invoices ?? [])
      .filter((i) => i.status === "paid" && i.user_id)
      .map((i) => i.user_id as string)
  );

  const withWebinar = new Set(webinarsByOwner.keys());
  const withVideo = new Set(
    allWebinars.filter((w) => w.video_url).map((w) => w.owner_id).filter(Boolean) as string[]
  );
  const published = new Set(
    allWebinars
      .filter((w) => w.status === "published")
      .map((w) => w.owner_id)
      .filter(Boolean) as string[]
  );

  const total = users.length;
  const pct = (n: number) => (total ? +((n / total) * 100).toFixed(1) : 0);

  // Each stage is a subset of the one before, so the drop is meaningful.
  const funnel = [
    { label: "Signed up", value: total, share: 100 },
    { label: "Created a webinar", value: withWebinar.size, share: pct(withWebinar.size) },
    { label: "Uploaded a video", value: withVideo.size, share: pct(withVideo.size) },
    { label: "Published", value: published.size, share: pct(published.size) },
    { label: "Got a registrant", value: withRegistrants.size, share: pct(withRegistrants.size) },
    { label: "Made a sale", value: withSales.size, share: pct(withSales.size) },
    { label: "Paid us", value: paidUsers.size, share: pct(paidUsers.size) },
  ];

  const signupAt = new Map(users.map((u) => [u.id, new Date(u.created_at).getTime()]));

  const daysToFirstWebinar: number[] = [];
  for (const [owner, list] of webinarsByOwner) {
    const start = signupAt.get(owner);
    if (!start) continue;
    const earliest = Math.min(...list.map((w) => new Date(w.created_at).getTime()));
    daysToFirstWebinar.push(Math.max(0, Math.round((earliest - start) / DAY)));
  }

  const daysToFirstRegistrant: number[] = [];
  for (const [owner, at] of firstRegistrationAt) {
    const start = signupAt.get(owner);
    if (!start) continue;
    daysToFirstRegistrant.push(
      Math.max(0, Math.round((new Date(at).getTime() - start) / DAY))
    );
  }

  const daysToFirstPayment: number[] = [];
  for (const invoice of invoices ?? []) {
    if (invoice.status !== "paid" || !invoice.user_id || !invoice.paid_at) continue;
    const start = signupAt.get(invoice.user_id);
    if (!start) continue;
    daysToFirstPayment.push(
      Math.max(0, Math.round((new Date(invoice.paid_at).getTime() - start) / DAY))
    );
  }

  const webinarCount = allWebinars.length;
  const distinct = (rows: { webinar_id: string }[] | null) =>
    new Set((rows ?? []).map((r) => r.webinar_id)).size;

  return NextResponse.json({
    funnel,
    timeToValue: {
      firstWebinarDays: median(daysToFirstWebinar),
      firstRegistrantDays: median(daysToFirstRegistrant),
      firstPaymentDays: median(daysToFirstPayment),
    },
    cohorts: cohorts ?? [],
    adoption: [
      {
        label: "Fake personas",
        used: distinct(personas),
        of: webinarCount,
        share: webinarCount ? +((distinct(personas) / webinarCount) * 100).toFixed(0) : 0,
      },
      {
        label: "Schedules",
        used: distinct(schedules),
        of: webinarCount,
        share: webinarCount ? +((distinct(schedules) / webinarCount) * 100).toFixed(0) : 0,
      },
      {
        label: "Offer configured",
        used: distinct(offers),
        of: webinarCount,
        share: webinarCount ? +((distinct(offers) / webinarCount) * 100).toFixed(0) : 0,
      },
      {
        label: "AI moderators",
        used: distinct(aiPersonas),
        of: webinarCount,
        share: webinarCount ? +((distinct(aiPersonas) / webinarCount) * 100).toFixed(0) : 0,
      },
      {
        label: "Integrations",
        used: new Set((integrations ?? []).map((r) => r.user_id)).size,
        of: total,
        share: pct(new Set((integrations ?? []).map((r) => r.user_id)).size),
      },
    ],
  });
}
