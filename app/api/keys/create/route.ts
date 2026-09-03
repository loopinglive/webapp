import { NextResponse } from "next/server";
import { z } from "zod";

import { generateApiKey } from "@/lib/api/auth";
import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).max(60).trim(),
  expiry: z.enum(["never", "30d", "90d", "1y"]).default("never"),
});

const DAYS: Record<string, number | null> = { never: null, "30d": 30, "90d": 90, "1y": 365 };

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Give the key a name.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const days = DAYS[parsed.data.expiry];
  const expiresAt = days
    ? new Date(Date.now() + days * 86_400_000).toISOString()
    : null;

  const { key, hash, prefix } = generateApiKey();

  const { data, error } = await createServiceClient()
    .from("api_keys")
    .insert({
      user_id: account.id,
      name: parsed.data.name,
      key_hash: hash,
      key_prefix: prefix,
      expires_at: expiresAt,
    })
    .select("id, name, key_prefix, expires_at, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The only time the plaintext key ever leaves this process.
  return NextResponse.json({ apiKey: data, key });
}
