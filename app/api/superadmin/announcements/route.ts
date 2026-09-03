import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TYPES = ["info", "warning", "success", "critical"];

export async function GET() {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { data } = await createServiceClient()
    .from("platform_announcements")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ announcements: data ?? [] });
}

export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const body = (await request.json()) as {
    title?: string;
    body?: string;
    type?: string;
    startsAt?: string;
    endsAt?: string | null;
  };

  const title = (body.title ?? "").trim();
  const text = (body.body ?? "").trim();

  if (!title || !text) {
    return NextResponse.json({ error: "A title and body are required." }, { status: 400 });
  }

  const { data, error } = await createServiceClient()
    .from("platform_announcements")
    .insert({
      title,
      body: text,
      type: TYPES.includes(body.type ?? "") ? body.type! : "info",
      starts_at: body.startsAt || new Date().toISOString(),
      ends_at: body.endsAt || null,
      created_by: admin.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data });
}

export async function PATCH(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { id, isActive } = (await request.json()) as { id?: string; isActive?: boolean };
  if (!id) return NextResponse.json({ error: "An announcement is required." }, { status: 400 });

  await createServiceClient()
    .from("platform_announcements")
    .update({ is_active: Boolean(isActive) })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
