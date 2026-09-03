import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import {
  verifyActiveCampaign,
  verifyConvertKit,
  verifyGoHighLevel,
  verifyMailchimp,
} from "@/lib/integrations/providers";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({
  provider: z.enum(["mailchimp", "convertkit", "activecampaign", "gohighlevel"]),
  apiKey: z.string().min(8).max(500).trim(),
  settings: z.record(z.string(), z.string()).default({}),
});

/**
 * Connects a marketing platform.
 *
 * The credential is verified against the provider before anything is stored --
 * saving a key that does not work would fail silently later, during a real
 * registration, where nobody would see it.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provider and API key are required.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const { provider, apiKey, settings } = parsed.data;

  const verification =
    provider === "mailchimp"
      ? await verifyMailchimp(apiKey)
      : provider === "convertkit"
        ? await verifyConvertKit(apiKey)
        : provider === "activecampaign"
          ? await verifyActiveCampaign(apiKey, settings)
          : await verifyGoHighLevel(apiKey);

  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 400 });
  }

  const { error } = await createServiceClient()
    .from("integrations")
    .upsert(
      {
        user_id: account.id,
        provider,
        api_key: apiKey,
        account_name: verification.accountName ?? null,
        account_id: verification.accountId ?? null,
        settings,
        status: "connected",
        last_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, options: verification.options ?? [] });
}
