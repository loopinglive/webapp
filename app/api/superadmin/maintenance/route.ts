import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const { data } = await createServiceClient()
    .from("app_config")
    .select("key, value, updated_at")
    .in("key", ["maintenance_mode", "maintenance_message"]);

  const config = new Map((data ?? []).map((row) => [row.key, row]));

  return NextResponse.json({
    enabled: config.get("maintenance_mode")?.value === "true",
    message: config.get("maintenance_message")?.value ?? "",
    changedAt: config.get("maintenance_mode")?.updated_at ?? null,
    // The environment variable overrides the toggle and cannot be changed from
    // here. Reported so the screen never claims the site is up when it is not.
    forcedByEnv: process.env.MAINTENANCE_MODE === "true",
  });
}

const schema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500).trim().optional(),
});

/**
 * Turns the site off, or back on.
 *
 * A toggle rather than a redeploy, because needing a deploy to stop serving is
 * exactly wrong when the reason you are stopping is that the last deploy was
 * bad. Takes up to thirty seconds to reach every request — the proxy caches
 * the flag rather than reading it on every page load.
 */
export async function POST(request: Request) {
  const { account: admin, response: denied } =
    await requireCapability("platform_config");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const rows = [
    {
      key: "maintenance_mode",
      value: parsed.data.enabled ? "true" : "false",
      updated_at: now,
    },
  ];

  if (parsed.data.message) {
    rows.push({
      key: "maintenance_message",
      value: parsed.data.message,
      updated_at: now,
    });
  }

  const { error } = await supabase.from("app_config").upsert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("admin_actions").insert({
    admin_id: admin.id,
    action: parsed.data.enabled ? "maintenance_enabled" : "maintenance_disabled",
    detail: { message: parsed.data.message ?? null } as never,
  });

  return NextResponse.json({ enabled: parsed.data.enabled });
}
