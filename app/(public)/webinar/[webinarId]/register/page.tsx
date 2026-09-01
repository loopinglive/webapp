import { notFound } from "next/navigation";
import Script from "next/script";
import type { Metadata } from "next";

import { RegistrationPagePreview } from "@/components/registration-builder/preview/RegistrationPagePreview";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { LocalTime } from "@/components/webinar/LocalTime";
import { createServiceClient } from "@/lib/supabase/server";
import {
  facebookPixelSnippet,
  googleAnalyticsSnippet,
} from "@/lib/tracking";
import type { CustomField, RegistrationConfig } from "@/types";

export const dynamic = "force-dynamic";

async function load(webinarId: string) {
  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, description, video_duration_seconds")
    .eq("id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  if (!webinar) return null;

  const [{ data: config }, { data: sessions }, { count }] = await Promise.all([
    supabase
      .from("registration_page_config")
      .select("*")
      .eq("webinar_id", webinarId)
      .maybeSingle(),
    supabase
      .from("webinar_sessions")
      .select("starts_at")
      .eq("webinar_id", webinarId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1),
    supabase
      .from("registrants")
      .select("id", { count: "exact", head: true })
      .eq("webinar_id", webinarId),
  ]);

  return {
    webinar,
    config: config as RegistrationConfig | null,
    startsAt: sessions?.[0]?.starts_at ?? null,
    registrantCount: count ?? 0,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}): Promise<Metadata> {
  const { webinarId } = await params;
  const data = await load(webinarId);
  return {
    title: data?.config?.headline ?? data?.webinar.title ?? "Register",
    description: data?.config?.subheadline ?? data?.webinar.description ?? undefined,
  };
}

/** Falls back to the webinar's own details when the host has not opened the builder. */
function fallbackConfig(
  webinarId: string,
  title: string,
  description: string | null
): RegistrationConfig {
  const now = new Date().toISOString();
  return {
    id: "default",
    webinar_id: webinarId,
    logo_url: null,
    hero_image_url: null,
    background_type: "gradient",
    background_value: "linear-gradient(135deg, #0A0A0F 0%, #1A0A2E 100%)",
    primary_colour: "#6C47FF",
    secondary_colour: "#00D4FF",
    headline: title,
    subheadline: description,
    host_name: null,
    host_title: null,
    host_avatar_url: null,
    what_you_will_learn: [],
    social_proof_count: 0,
    social_proof_label: "people have already registered",
    show_attendee_count: true,
    show_session_time: true,
    cta_button_text: "Reserve My Spot →",
    thank_you_headline: "You are registered!",
    thank_you_subheadline: "Check your email for the webinar details.",
    thank_you_redirect_url: null,
    show_add_to_calendar: true,
    show_social_share: true,
    custom_fields: [],
    facebook_pixel_id: null,
    fb_track_pageview: true,
    fb_track_lead: true,
    google_analytics_id: null,
    ga_track_conversion: true,
    custom_domain: null,
    custom_domain_status: "not_connected",
    custom_css: null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  const data = await load(webinarId);

  if (!data) notFound();

  const config =
    data.config ??
    fallbackConfig(webinarId, data.webinar.title, data.webinar.description);

  // The host has taken the page offline.
  if (!config.is_active) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#0A0A0F] px-5 text-center">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-white">
            Coming soon
          </h1>
          <p className="mt-3 text-[14.5px] text-[#A0A0B0]">
            Registration for this webinar is not open yet.
          </p>
        </div>
      </main>
    );
  }

  const customFields = (
    Array.isArray(config.custom_fields) ? config.custom_fields : []
  ) as CustomField[];

  return (
    <main className="min-h-dvh bg-[#0A0A0F]">
      {config.facebook_pixel_id && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {facebookPixelSnippet(config.facebook_pixel_id, config.fb_track_pageview)}
        </Script>
      )}

      {config.google_analytics_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${config.google_analytics_id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {googleAnalyticsSnippet(config.google_analytics_id)}
          </Script>
        </>
      )}

      {/* Same renderer the builder previews, fed the saved row. */}
      <RegistrationPagePreview
        config={config}
        registrantCount={data.registrantCount}
        sessionTime={
          data.startsAt ? (
            <LocalTime iso={data.startsAt} fallback="Being scheduled" />
          ) : (
            "Next session being scheduled"
          )
        }
        interactive
      >
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-white">
          Save your seat
        </h2>
        <p className="mt-1.5 text-[13.5px] text-white/60">
          We will send the link to your email and phone.
        </p>
        <div className="mt-6">
          <RegistrationForm
            webinarId={webinarId}
            customFields={customFields}
            ctaText={config.cta_button_text}
            buttonColour={config.primary_colour}
            pixelId={config.facebook_pixel_id}
            trackLeadEvent={config.fb_track_lead}
            gaId={config.google_analytics_id}
            trackConversion={config.ga_track_conversion}
          />
        </div>
      </RegistrationPagePreview>
    </main>
  );
}
