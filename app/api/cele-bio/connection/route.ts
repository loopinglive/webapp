import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { encryptSecret } from "@/lib/white-label/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import type { CeleBioConnectionRow } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Account-level Cele.bio connection.
 *
 * There is no public Cele.bio OAuth app to register here, so — same shape as
 * the marketing-platform integrations — the host pastes the access token
 * from their own Cele.bio account settings rather than going through a
 * redirect flow. It is encrypted at rest with the same scheme as the SMTP
 * password (lib/white-label/crypto.ts was written with this in mind).
 */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data } = await createServiceClient()
    .from("cele_bio_connections")
    .select(
      "id, cele_bio_user_id, cele_bio_username, auto_sync_enabled, show_on_profile, use_cele_bio_payments, connected_at, last_synced_at"
    )
    .eq("user_id", account.id)
    .maybeSingle();

  return NextResponse.json({ connection: data ?? null });
}

const connectSchema = z.object({
  celeBioUsername: z.string().min(1).max(200).trim(),
  celeBioUserId: z.string().min(1).max(200).trim(),
  accessToken: z.string().min(8).max(2000).trim(),
});

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = connectSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { error } = await createServiceClient()
    .from("cele_bio_connections")
    .upsert(
      {
        user_id: account.id,
        cele_bio_user_id: parsed.data.celeBioUserId,
        cele_bio_username: parsed.data.celeBioUsername,
        access_token_encrypted: encryptSecret(parsed.data.accessToken),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  autoSyncEnabled: z.boolean().optional(),
  showOnProfile: z.boolean().optional(),
  useCeleBioPayments: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const update: Partial<CeleBioConnectionRow> = {};
  if (parsed.data.autoSyncEnabled !== undefined) update.auto_sync_enabled = parsed.data.autoSyncEnabled;
  if (parsed.data.showOnProfile !== undefined) update.show_on_profile = parsed.data.showOnProfile;
  if (parsed.data.useCeleBioPayments !== undefined) update.use_cele_bio_payments = parsed.data.useCeleBioPayments;

  const { error } = await createServiceClient()
    .from("cele_bio_connections")
    .update(update)
    .eq("user_id", account.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { error } = await createServiceClient().from("cele_bio_connections").delete().eq("user_id", account.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
