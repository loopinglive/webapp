import { NextResponse } from "next/server";

import { clientIp, LIMITS, rateLimit } from "@/lib/ratelimit";
import { canonicalEmail, checkEmail } from "@/lib/email-hygiene";

import { syncContactInBackground } from "@/lib/integrations/sync";
import { dispatchWebhookInBackground } from "@/lib/webhooks/dispatch";

import { clearAttendeeHistory, logEvent, syncSegment } from "@/lib/attendee-tracking";
import { createServiceClient } from "@/lib/supabase/server";
import { countryByCode, flagFor } from "@/lib/countries";
import { geoCountry, parseUserAgent } from "@/lib/device";
import { broadcast, waitingRoomTopic } from "@/lib/realtime-broadcast";
import { scheduleRegistrationMessages, seedTemplates } from "@/lib/messaging/scheduler";
import type { PublicJoiner, StoredRegistrant } from "@/types";

type Source = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPage?: string;
};

type Payload = {
  fullName?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  gdprConsent?: boolean;
  customFields?: Record<string, unknown>;
  source?: Source;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  // Registration is the most spammable endpoint on the platform.
  const limit = rateLimit(`register:${clientIp(request)}`, LIMITS.register);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const { webinarId } = await params;
  const body = (await request.json()) as Payload;

  const fullName = body.fullName?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  const country = body.countryCode ? countryByCode(body.countryCode) : undefined;

  if (!fullName || !email || !phone || !country) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "That email does not look right." }, { status: 400 });
  }

  /*
   * A throwaway address or a domain that only exists as a typo.
   *
   * Refused rather than accepted quietly: both produce a registrant who never
   * receives the link, and a host whose show-up rate is measured against
   * people who were never going to show up.
   */
  const verdict = checkEmail(email);
  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.message }, { status: 400 });
  }

  // The form two addresses share when they reach the same inbox. Used for
  // matching only — the confirmation goes to the address they typed.
  const emailCanonical = canonicalEmail(email);
  if (!body.gdprConsent) {
    return NextResponse.json(
      { error: "Please accept the consent checkbox to continue." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, owner_id, video_duration_seconds")
    .eq("id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  if (!webinar) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  // Attach them to the session they will actually attend: the one under way, or
  // the next one due.
  const earliest = new Date(
    Date.now() - (webinar.video_duration_seconds ?? 0) * 1000
  ).toISOString();

  const { data: sessions } = await supabase
    .from("webinar_sessions")
    .select("id")
    .eq("webinar_id", webinarId)
    .gte("starts_at", earliest)
    .order("starts_at", { ascending: true })
    .limit(1);

  const sessionId = sessions?.[0]?.id ?? null;
  const countryFlag = flagFor(country.code);
  const normalisedPhone = phone.startsWith("+")
    ? phone
    : `${country.dial}${phone.replace(/^0+/, "")}`;

  // Read server-side from the request. A client-supplied device or country is
  // trivially forged and would quietly poison the breakdowns.
  const device = parseUserAgent(request.headers.get("user-agent"));
  const ipCountry = geoCountry(request.headers);

  /**
   * Someone who has registered for this webinar before.
   *
   * A non-buyer starts over: their watch history and chat are wiped so the
   * follow-up engine treats them as new. A buyer is left exactly as they are —
   * their history is what stops them being sold the same thing twice.
   */
  /*
   * Matched on the canonical address, so `j.smith+webinar@gmail.com` finds the
   * row created by `jsmith@gmail.com`.
   *
   * Ordered and limited rather than `maybeSingle()`: rows predating this
   * column can already collide on the canonical form, and a duplicate that
   * turns registration into a 500 would be a worse outcome than picking the
   * earliest of them.
   */
  const findBy = (column: "email" | "email_canonical", value: string) =>
    supabase
      .from("registrants")
      .select("id, bought")
      .eq("webinar_id", webinarId)
      .eq(column, value)
      .order("created_at", { ascending: true })
      .limit(1);

  // Two typed queries rather than one `.or()` string: that filter is parsed by
  // PostgREST, and an address is user input that would be interpolated into
  // its comma-and-paren syntax.
  const [{ data: byCanonical }, { data: byExact }] = await Promise.all([
    findBy("email_canonical", emailCanonical),
    // Rows that predate the canonical column have it backfilled, but only
    // approximately — this is the exact match those rows still need.
    findBy("email", email),
  ]);

  const existing = byCanonical?.[0] ?? byExact?.[0] ?? null;

  let registrantId: string;

  if (existing) {
    if (!existing.bought) {
      await clearAttendeeHistory(supabase, existing.id);
    }

    const { error } = await supabase
      .from("registrants")
      .update({
        session_id: sessionId,
        email_canonical: emailCanonical,
        full_name: fullName,
        phone: normalisedPhone,
        country_code: country.code,
        country_flag: countryFlag,
        returning_attendee: true,
        device_type: device.deviceType,
        browser: device.browser,
        os: device.os,
        ip_country: ipCountry,
      })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    registrantId = existing.id;
    await logEvent(supabase, {
      registrantId,
      sessionId,
      type: "rejoined",
      data: { buyer: existing.bought },
    });
  } else {
    const { data: created, error } = await supabase
      .from("registrants")
      .insert({
        webinar_id: webinarId,
        session_id: sessionId,
        full_name: fullName,
        email,
        email_canonical: emailCanonical,
        phone: normalisedPhone,
        country_code: country.code,
        country_flag: countryFlag,
        device_type: device.deviceType,
        browser: device.browser,
        os: device.os,
        ip_country: ipCountry,
      })
      .select("id")
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: error?.message ?? "Could not save your spot." },
        { status: 500 }
      );
    }

    registrantId = created.id;

    // Rule: source data is captured once and never updated.
    const source = body.source ?? {};
    await supabase.from("attendee_sources").insert({
      registrant_id: registrantId,
      utm_source: source.utmSource || null,
      utm_medium: source.utmMedium || null,
      utm_campaign: source.utmCampaign || null,
      utm_content: source.utmContent || null,
      utm_term: source.utmTerm || null,
      referrer_url: source.referrer || null,
      landing_page_url: source.landingPage || null,
    });

    await logEvent(supabase, {
      registrantId,
      sessionId,
      type: "registered",
      data: (body.customFields ?? {}) as Record<string, unknown>,
    });
  }

  await syncSegment(supabase, registrantId);

  // Outbound webhooks and marketing sync, both in the background: a host's
  // Zapier endpoint or an expired Mailchimp key must never make a registrant
  // wait, or fail a registration that has already been written.
  dispatchWebhookInBackground(webinar.owner_id, "registrant.created", {
    registrantId,
    name: fullName,
    email,
    phone: normalisedPhone,
    country: country.code,
    webinarId,
    webinarTitle: webinar.title,
    sessionId,
    registeredAt: new Date().toISOString(),
    source: body.source ?? {},
  });

  syncContactInBackground(
    webinar.owner_id,
    "registrant.created",
    { email, full_name: fullName, phone: normalisedPhone },
    webinar.title
  );

  // Confirmation now, reminders at their moments. A re-registration replaces
  // whatever was queued: clearAttendeeHistory cancelled the old session's
  // messages, and the unique key means the new ones cannot double up.
  await seedTemplates(supabase, webinarId);
  await scheduleRegistrationMessages(supabase, {
    webinarId,
    registrantId,
    sessionId,
  });

  // Live social proof for anyone already holding in the waiting room. First
  // name and flag only — the row this came from never leaves the server.
  const joiner: PublicJoiner = {
    id: registrantId,
    fullName: fullName.split(/\s+/)[0],
    countryFlag,
    createdAt: new Date().toISOString(),
  };
  await broadcast(waitingRoomTopic(webinarId), "joined", { joiner });

  const stored: StoredRegistrant = {
    id: registrantId,
    webinarId,
    sessionId,
    fullName,
    countryFlag,
  };

  return NextResponse.json(stored);
}
