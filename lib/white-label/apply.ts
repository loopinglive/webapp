import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

export type WhiteLabelConfig = {
  id: string;
  user_id: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_favicon_url: string | null;
  primary_colour: string;
  secondary_colour: string;
  background_colour: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  hide_loopinglive_branding: boolean;
  custom_login_page_headline: string | null;
  custom_login_page_subheadline: string | null;
  custom_support_email: string | null;
  custom_terms_url: string | null;
  custom_privacy_url: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
  use_custom_smtp: boolean;
};

const COLUMNS =
  "id, user_id, brand_name, brand_logo_url, brand_favicon_url, primary_colour, secondary_colour, background_colour, custom_domain, custom_domain_verified, hide_loopinglive_branding, custom_login_page_headline, custom_login_page_subheadline, custom_support_email, custom_terms_url, custom_privacy_url, email_from_name, email_from_address, use_custom_smtp";

/**
 * The white label config for a request, resolved by the hostname it arrived
 * on — the entry point for rebranding a registration page, watch room, or
 * outgoing email to look like it belongs to the host, not Loopinglive.
 *
 * Only ever returns a verified domain's config: an unverified custom domain
 * still points at the platform default until its DNS is proven, which is
 * also why nothing here needs to run in the proxy — a cache-miss just means
 * default branding, never a broken page.
 */
export async function getWhiteLabelConfigByDomain(
  hostname: string | null
): Promise<WhiteLabelConfig | null> {
  if (!hostname) return null;

  const { data } = await createServiceClient()
    .from("white_label_configs")
    .select(COLUMNS)
    .eq("custom_domain", hostname)
    .eq("custom_domain_verified", true)
    .maybeSingle();

  return data as WhiteLabelConfig | null;
}

/** The config for a specific webinar's owner — used on registration/watch pages. */
export async function getWhiteLabelConfigForOwner(
  ownerId: string | null
): Promise<WhiteLabelConfig | null> {
  if (!ownerId) return null;

  const { data } = await createServiceClient()
    .from("white_label_configs")
    .select(COLUMNS)
    .eq("user_id", ownerId)
    .maybeSingle();

  if (!data) return null;

  // White label is a Yearly/Lifetime entitlement, re-checked on every read —
  // a downgrade must remove the branding immediately, not just block the
  // settings page from being saved again.
  const { data: account } = await createServiceClient()
    .from("user_accounts")
    .select("plan_slug, subscription_status, is_suspended")
    .eq("id", ownerId)
    .maybeSingle();

  const entitled =
    account &&
    !account.is_suspended &&
    ["yearly", "lifetime"].includes(account.plan_slug ?? "") &&
    account.subscription_status !== "cancelled";

  return entitled ? (data as WhiteLabelConfig) : null;
}

/** Effective brand name for display — falls back to Loopinglive. */
export function brandName(config: WhiteLabelConfig | null) {
  return config?.hide_loopinglive_branding && config.brand_name
    ? config.brand_name
    : "Loopinglive";
}
