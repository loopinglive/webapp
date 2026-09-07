import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAnyAdmin } from "@/lib/admin-auth";
import { translateWebinarCopy } from "@/lib/anthropic";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ languageCode: z.string().min(2).max(10) });

/** Auto-fills a language's translation from the webinar's base English copy. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "languageCode is required" }, { status: 422 });
  }

  const supabase = createServiceClient();
  const [{ data: webinar }, { data: config }] = await Promise.all([
    supabase.from("webinars").select("title, description").eq("id", webinarId).maybeSingle(),
    supabase
      .from("registration_page_config")
      .select("headline, subheadline, what_you_will_learn, cta_button_text")
      .eq("webinar_id", webinarId)
      .maybeSingle(),
  ]);

  if (!webinar) return NextResponse.json({ error: "Webinar not found" }, { status: 404 });

  const translated = await translateWebinarCopy({
    languageCode: parsed.data.languageCode,
    title: webinar.title,
    description: webinar.description ?? "",
    registrationHeadline: config?.headline ?? webinar.title,
    registrationSubheadline: config?.subheadline ?? "",
    whatYouWillLearn: Array.isArray(config?.what_you_will_learn) ? (config.what_you_will_learn as string[]) : [],
    ctaButtonText: config?.cta_button_text ?? "Save my seat",
  });

  if (!translated) {
    return NextResponse.json({ error: "The model did not return a translation. Try again." }, { status: 502 });
  }

  const { error } = await supabase.from("webinar_translations").upsert(
    {
      webinar_id: webinarId,
      language_code: parsed.data.languageCode,
      title: translated.title,
      description: translated.description,
      registration_headline: translated.registrationHeadline,
      registration_subheadline: translated.registrationSubheadline,
      what_you_will_learn: translated.whatYouWillLearn,
      cta_button_text: translated.ctaButtonText,
      auto_translated: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "webinar_id,language_code" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, translation: translated });
}
