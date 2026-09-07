import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAnyAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response: denied, user } = await requireAnyAdmin();
  if (denied) return denied;

  const { data, error } = await createServiceClient()
    .from("upsell_sequences")
    .select(
      "id, source_webinar_id, target_webinar_id, delay_days, is_active, email_subject, email_body, source:webinars!upsell_sequences_source_webinar_id_fkey(title), target:webinars!upsell_sequences_target_webinar_id_fkey(title)"
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sequences: data ?? [] });
}

const postSchema = z.object({
  sourceWebinarId: z.string().uuid(),
  targetWebinarId: z.string().uuid(),
  delayDays: z.number().int().min(0).max(365).default(30),
  emailSubject: z.string().max(200).optional(),
  emailBody: z.string().max(5000).optional(),
});

export async function POST(request: Request) {
  const { response: denied, user } = await requireAnyAdmin();
  if (denied) return denied;

  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  if (parsed.data.sourceWebinarId === parsed.data.targetWebinarId) {
    return NextResponse.json({ error: "Source and target must be different webinars." }, { status: 422 });
  }

  const { error } = await createServiceClient().from("upsell_sequences").upsert(
    {
      owner_id: user.id,
      source_webinar_id: parsed.data.sourceWebinarId,
      target_webinar_id: parsed.data.targetWebinarId,
      delay_days: parsed.data.delayDays,
      email_subject: parsed.data.emailSubject ?? null,
      email_body: parsed.data.emailBody ?? null,
      is_active: true,
    },
    { onConflict: "source_webinar_id,target_webinar_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const parsed = z
    .object({ id: z.string().uuid(), isActive: z.boolean() })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const { error } = await createServiceClient()
    .from("upsell_sequences")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await createServiceClient().from("upsell_sequences").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
