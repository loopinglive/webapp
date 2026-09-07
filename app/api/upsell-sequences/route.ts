import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { requireAccountAccess, requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const { data, error } = await createServiceClient()
    .from("upsell_sequences")
    .select(
      "id, source_webinar_id, target_webinar_id, delay_days, is_active, email_subject, email_body, source:webinars!upsell_sequences_source_webinar_id_fkey(title), target:webinars!upsell_sequences_target_webinar_id_fkey(title)"
    )
    .eq("owner_id", access.actorId)
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
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  if (parsed.data.sourceWebinarId === parsed.data.targetWebinarId) {
    return NextResponse.json({ error: "Source and target must be different webinars." }, { status: 422 });
  }

  if (!access.isPlatformAdmin) {
    const [sourceAccess, targetAccess] = await Promise.all([
      requireWebinarAccess(parsed.data.sourceWebinarId),
      requireWebinarAccess(parsed.data.targetWebinarId),
    ]);
    if (!sourceAccess.ok) return sourceAccess.response;
    if (!targetAccess.ok) return targetAccess.response;
  }

  const { error } = await createServiceClient().from("upsell_sequences").upsert(
    {
      owner_id: access.actorId,
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

async function ownsSequence(id: string, ownerId: string) {
  const { data } = await createServiceClient()
    .from("upsell_sequences")
    .select("id")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return Boolean(data);
}

export async function PATCH(request: Request) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const parsed = z
    .object({ id: z.string().uuid(), isActive: z.boolean() })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  if (!access.isPlatformAdmin && !(await ownsSequence(parsed.data.id, access.actorId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await createServiceClient()
    .from("upsell_sequences")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  if (!access.isPlatformAdmin && !(await ownsSequence(id, access.actorId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await createServiceClient().from("upsell_sequences").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
