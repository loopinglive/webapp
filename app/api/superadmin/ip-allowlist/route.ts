import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { clientIp } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const supabase = createServiceClient();

  const [{ data: entries }, { data: config }] = await Promise.all([
    supabase
      .from("admin_ip_allowlist")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("app_config")
      .select("value")
      .eq("key", "admin_ip_allowlist_enabled")
      .maybeSingle(),
  ]);

  return NextResponse.json({
    enabled: config?.value === "true",
    entries: entries ?? [],
    // Handed back so the screen can offer "add my current address" without
    // the admin having to go find it themselves.
    yourIp: clientIp(request),
  });
}

const addSchema = z.object({
  cidr: z.string().min(1).max(43),
  label: z.string().min(1).max(80).trim(),
});

export async function POST(request: Request) {
  const { account, response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const parsed = addSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "A CIDR block and a label are required." }, {
      status: 422,
    });
  }

  // A bare address needs a mask before Postgres' inet type will treat it as
  // one host rather than reading trailing digits as an invalid block.
  const cidr = parsed.data.cidr.includes("/")
    ? parsed.data.cidr
    : `${parsed.data.cidr}/32`;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("admin_ip_allowlist")
    .insert({ cidr, label: parsed.data.label, created_by: account.id })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("invalid input syntax")
          ? "That does not look like a valid address or CIDR block."
          : error.message,
      },
      { status: 400 }
    );
  }

  await supabase.from("admin_actions").insert({
    admin_id: account.id,
    action: "admin_ip_allowlist_added",
    detail: { cidr, label: parsed.data.label } as never,
  });

  return NextResponse.json({ entry: data });
}

const toggleSchema = z.object({ enabled: z.boolean() });

export async function PUT(request: Request) {
  const { account, response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const parsed = toggleSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  /*
   * Refuse to enable it if the requesting admin's own address is not covered.
   *
   * This is the one safeguard that actually prevents the failure the whole
   * design is worried about — every check elsewhere assumes good faith from
   * whoever clicks the toggle, and this is where a mistake would otherwise
   * become irreversible without a database console.
   */
  if (parsed.data.enabled) {
    const ip = clientIp(request);
    const { data: covered } = await supabase.rpc("admin_ip_allowed", { p_ip: ip });

    const { count } = await supabase
      .from("admin_ip_allowlist")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) === 0) {
      return NextResponse.json(
        { error: "Add at least one address before turning this on." },
        { status: 400 }
      );
    }
    if (!covered) {
      return NextResponse.json(
        {
          error: `Your current address (${ip}) is not on the list. Add it first, or you will be locked out.`,
        },
        { status: 400 }
      );
    }
  }

  await supabase
    .from("app_config")
    .upsert({
      key: "admin_ip_allowlist_enabled",
      value: parsed.data.enabled ? "true" : "false",
      updated_at: new Date().toISOString(),
    });

  await supabase.from("admin_actions").insert({
    admin_id: account.id,
    action: parsed.data.enabled
      ? "admin_ip_allowlist_enabled"
      : "admin_ip_allowlist_disabled",
    detail: {} as never,
  });

  return NextResponse.json({ enabled: parsed.data.enabled });
}

export async function DELETE(request: Request) {
  const { account, response: denied } = await requireCapability("platform_config");
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServiceClient();

  await supabase.from("admin_ip_allowlist").delete().eq("id", id);

  await supabase.from("admin_actions").insert({
    admin_id: account.id,
    action: "admin_ip_allowlist_removed",
    detail: { id } as never,
  });

  return NextResponse.json({ success: true });
}
