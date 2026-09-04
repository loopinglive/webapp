import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { encryptSecret } from "@/lib/white-label/crypto";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  brand_name: z.string().trim().min(1).max(80),
  brand_logo_url: z.string().url().nullable().optional(),
  brand_favicon_url: z.string().url().nullable().optional(),
  primary_colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary_colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background_colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  custom_domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)
    .nullable()
    .optional()
    .or(z.literal("")),
  hide_loopinglive_branding: z.boolean(),
  custom_login_page_headline: z.string().max(200).nullable().optional(),
  custom_login_page_subheadline: z.string().max(300).nullable().optional(),
  custom_support_email: z.string().email().nullable().optional().or(z.literal("")),
  custom_terms_url: z.string().url().nullable().optional().or(z.literal("")),
  custom_privacy_url: z.string().url().nullable().optional().or(z.literal("")),
  email_from_name: z.string().max(80).nullable().optional(),
  email_from_address: z.string().email().nullable().optional().or(z.literal("")),
  use_custom_smtp: z.boolean(),
  smtp_host: z.string().max(200).nullable().optional(),
  smtp_port: z.number().int().min(1).max(65535).nullable().optional(),
  smtp_username: z.string().max(200).nullable().optional(),
  smtp_password: z.string().max(500).nullable().optional(),
});

/** Only Yearly and Lifetime accounts may use white label. */
function entitled(account: { plan_slug: string; is_suspended: boolean; subscription_status: string | null }) {
  return (
    !account.is_suspended &&
    ["yearly", "lifetime"].includes(account.plan_slug) &&
    account.subscription_status !== "cancelled"
  );
}

export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await createServiceClient()
    .from("white_label_configs")
    .select(
      "id, brand_name, brand_logo_url, brand_favicon_url, primary_colour, secondary_colour, background_colour, custom_domain, custom_domain_verified, hide_loopinglive_branding, custom_login_page_headline, custom_login_page_subheadline, custom_support_email, custom_terms_url, custom_privacy_url, email_from_name, email_from_address, use_custom_smtp, smtp_host, smtp_port, smtp_username"
    )
    .eq("user_id", account.id)
    .maybeSingle();

  return NextResponse.json({ config: data, entitled: entitled(account) });
}

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!entitled(account)) {
    return NextResponse.json(
      { error: "White label is available on Yearly and Lifetime plans." },
      { status: 403 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { smtp_password, custom_domain, ...rest } = parsed.data;
  const service = createServiceClient();

  // A custom SMTP host must actually work before it can be saved — a broken
  // config saved silently means every automated email for this host's
  // webinars fails from the moment they hit save.
  if (rest.use_custom_smtp) {
    if (!rest.smtp_host || !rest.smtp_port || !rest.smtp_username || !smtp_password) {
      return NextResponse.json(
        { error: "Full SMTP credentials are required to enable custom SMTP." },
        { status: 422 }
      );
    }
    const test = await testSmtpConnection({
      host: rest.smtp_host,
      port: rest.smtp_port,
      username: rest.smtp_username,
      password: smtp_password,
    });
    if (!test.ok) {
      return NextResponse.json({ error: `SMTP test failed: ${test.error}` }, { status: 422 });
    }
  }

  // A domain change must be re-verified — flipping it back to unverified
  // rather than trusting whatever the last check happened to say.
  const { data: existing } = await service
    .from("white_label_configs")
    .select("custom_domain, custom_domain_verified")
    .eq("user_id", account.id)
    .maybeSingle();

  const domainChanged = (custom_domain || null) !== (existing?.custom_domain ?? null);

  const row = {
    user_id: account.id,
    ...rest,
    custom_domain: custom_domain || null,
    custom_domain_verified: domainChanged ? false : (existing?.custom_domain_verified ?? false),
    ...(smtp_password ? { smtp_password_encrypted: encryptSecret(smtp_password) } : {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await service
    .from("white_label_configs")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That domain is already in use." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function testSmtpConnection(config: {
  host: string;
  port: number;
  username: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  // No SMTP client is bundled in this deployment (Resend is the only
  // configured email path). A real handshake would need `nodemailer` added as
  // a dependency; until then this validates reachability of the host and port
  // rather than pretending to a full protocol exchange it cannot perform.
  try {
    const net = await import("node:net");
    await new Promise<void>((resolve, reject) => {
      const socket = net.connect({ host: config.host, port: config.port, timeout: 5000 });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("timeout", () => {
        socket.destroy();
        reject(new Error("Connection timed out"));
      });
      socket.once("error", (err) => reject(err));
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach host" };
  }
}
