import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ThankYouContent } from "@/components/registration/ThankYouContent";
import { createServiceClient } from "@/lib/supabase/server";
import type { RegistrationConfig } from "@/types";

export const metadata: Metadata = { title: "You are registered" };
export const dynamic = "force-dynamic";

export default async function ThankYouPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, video_duration_seconds")
    .eq("id", webinarId)
    .maybeSingle();

  if (!webinar) notFound();

  const [{ data: config }, { data: sessions }] = await Promise.all([
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
  ]);

  // A registration that happened before the host opened the builder still needs
  // a thank you page.
  const resolved: RegistrationConfig =
    (config as RegistrationConfig | null) ??
    ({
      primary_colour: "#6C47FF",
      background_type: "dark",
      background_value: "#0A0A0F",
      thank_you_headline: "You are registered!",
      thank_you_subheadline: "Check your email for the webinar details.",
      thank_you_redirect_url: null,
      show_add_to_calendar: true,
      show_social_share: true,
    } as RegistrationConfig);

  return (
    <ThankYouContent
      webinarId={webinarId}
      config={resolved}
      webinarTitle={webinar.title}
      startsAt={sessions?.[0]?.starts_at ?? null}
      durationSeconds={webinar.video_duration_seconds ?? 3600}
    />
  );
}
