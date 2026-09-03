import "server-only";

import { SITE } from "@/lib/constants";
import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { sendEmail } from "@/lib/messaging/providers";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Authentication email, sent by us.
 *
 * Supabase will happily send its own confirmation and recovery mail, but it
 * goes out from mail.app.supabase.io in Supabase's default styling — the
 * cheapest-looking surface a new customer sees, on a domain we neither own nor
 * monitor.
 *
 * `generateLink` produces the token *without* sending anything, so we render
 * our own template and deliver it through Resend on the verified domain. The
 * link points at our own /auth/confirm rather than Supabase's verify endpoint,
 * so the URL a customer sees is loopinglive.com throughout.
 *
 * This needs no Supabase dashboard configuration, which matters: an SMTP
 * setting someone has to remember to re-apply is a setting that eventually
 * gets lost.
 */

type LinkType = "signup" | "recovery" | "email_change_current";

const FROM_EMAIL = () =>
  process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com";

async function deliver(
  templateKey: string,
  to: string,
  variables: Record<string, string>
) {
  const { subject, html, text } = renderPlatformEmail(templateKey, variables, {
    brandName: "Loopinglive",
  });

  return sendEmail({
    to,
    fromName: "Loopinglive",
    fromEmail: FROM_EMAIL(),
    subject,
    html,
    text,
  });
}

/**
 * Creates the account and emails a confirmation link.
 *
 * Returns the user id so the caller can finish setting up the account row
 * while the person is still on the page.
 */
export async function sendSignupConfirmation(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "signup",
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName } },
  });

  if (error || !data?.properties?.hashed_token) {
    return {
      ok: false as const,
      userId: null,
      error: error?.message ?? "Could not create the account.",
    };
  }

  const url = new URL("/auth/confirm", SITE.url);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "signup");
  url.searchParams.set("next", "/dashboard");

  const result = await deliver("host_verify_email", input.email, {
    host_name: input.fullName.split(" ")[0] || "there",
    action_url: url.toString(),
    expires_in: "24 hours",
  });

  return {
    ok: true as const,
    userId: data.user?.id ?? null,
    emailSent: result.ok,
    emailError: result.ok ? null : result.error,
  };
}

/** Emails a password reset link, or quietly does nothing if there is no account. */
export async function sendPasswordReset(email: string) {
  const supabase = createServiceClient();

  const { data: account } = await supabase
    .from("user_accounts")
    .select("full_name")
    .eq("email", email)
    .maybeSingle();

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  // Deliberately not surfaced to the caller: telling someone whether an
  // address is registered turns the reset form into a way to enumerate
  // customers.
  if (error || !data?.properties?.hashed_token) return { ok: true as const };

  const url = new URL("/auth/confirm", SITE.url);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "recovery");
  url.searchParams.set("next", "/reset-password");

  await deliver("host_password_reset", email, {
    host_name: (account?.full_name || "there").split(" ")[0],
    action_url: url.toString(),
    expires_in: "1 hour",
  });

  return { ok: true as const };
}

/** Security notice after a password actually changes. Never blocks the change. */
export async function sendPasswordChangedNotice(
  email: string,
  fullName: string | null
) {
  try {
    await deliver("host_password_changed", email, {
      host_name: (fullName || "there").split(" ")[0],
      event_time: new Date().toLocaleString("en-GB", {
        dateStyle: "long",
        timeStyle: "short",
      }),
      event_location: "",
      security_url: `${SITE.url}/settings`,
      support_email: "support@loopinglive.com",
    });
  } catch {
    /* a missing notice must not fail the password change */
  }
}

export type { LinkType };
