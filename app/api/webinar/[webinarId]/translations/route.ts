import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAnyAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Public: all translations for a webinar, or just one language via ?lang=. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const lang = new URL(request.url).searchParams.get("lang");
  const supabase = createServiceClient();

  let query = supabase.from("webinar_translations").select("*").eq("webinar_id", webinarId);
  if (lang) query = query.eq("language_code", lang);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return lang
    ? NextResponse.json({ translation: data?.[0] ?? null })
    : NextResponse.json({ translations: data ?? [] });
}

const patchSchema = z.object({
  languageCode: z.string().min(2).max(10),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  registrationHeadline: z.string().max(300).optional(),
  registrationSubheadline: z.string().max(500).optional(),
  whatYouWillLearn: z.array(z.string().max(200)).optional(),
  ctaButtonText: z.string().max(60).optional(),
  autoTranslated: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const { languageCode, whatYouWillLearn, registrationHeadline, registrationSubheadline, ctaButtonText, autoTranslated, ...rest } =
    parsed.data;

  const { error } = await createServiceClient().from("webinar_translations").upsert(
    {
      webinar_id: webinarId,
      language_code: languageCode,
      ...rest,
      ...(whatYouWillLearn !== undefined && { what_you_will_learn: whatYouWillLearn }),
      ...(registrationHeadline !== undefined && { registration_headline: registrationHeadline }),
      ...(registrationSubheadline !== undefined && { registration_subheadline: registrationSubheadline }),
      ...(ctaButtonText !== undefined && { cta_button_text: ctaButtonText }),
      ...(autoTranslated !== undefined && { auto_translated: autoTranslated }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "webinar_id,language_code" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const lang = new URL(request.url).searchParams.get("lang");
  if (!lang) return NextResponse.json({ error: "lang is required" }, { status: 400 });

  const { error } = await createServiceClient()
    .from("webinar_translations")
    .delete()
    .eq("webinar_id", webinarId)
    .eq("language_code", lang);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
