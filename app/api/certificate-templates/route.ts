import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

const designSchema = z.object({
  headline: z.string().max(120).default("Certificate of Attendance"),
  subheadline: z.string().max(200).default("This certifies that"),
  signature_name: z.string().max(80).default(""),
  signature_title: z.string().max(80).default(""),
  accent_colour: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6C47FF"),
  background_colour: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0A0A0F"),
  logo_url: z.string().url().nullable().optional(),
});

export type CertificateDesign = z.infer<typeof designSchema>;

export async function GET() {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const { data } = await createServiceClient()
    .from("certificate_templates")
    .select("id, name, design, is_default")
    .eq("user_id", access.actorId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ templates: data ?? [] });
}

/** Upserts the caller's single default template — one design, kept simple. */
export async function POST(request: Request) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const parsed = designSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const service = createServiceClient();

  const { data: existing } = await service
    .from("certificate_templates")
    .select("id")
    .eq("user_id", access.actorId)
    .eq("is_default", true)
    .maybeSingle();

  if (existing) {
    const { error } = await service
      .from("certificate_templates")
      .update({ design: parsed.data })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ id: existing.id });
  }

  const { data: created, error } = await service
    .from("certificate_templates")
    .insert({ user_id: access.actorId, name: "Default", design: parsed.data, is_default: true })
    .select("id")
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? "Could not save template." }, { status: 500 });
  }

  return NextResponse.json({ id: created.id });
}
