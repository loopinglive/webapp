import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Public — an attendee watching the replay picks a caption language with no account. */
export async function GET(request: Request, { params }: { params: Promise<{ webinarId: string }> }) {
  const { webinarId } = await params;
  const lang = new URL(request.url).searchParams.get("lang")?.toUpperCase();

  const supabase = createServiceClient();
  const { data: config } = await supabase
    .from("real_time_translations")
    .select("source_language, target_languages")
    .eq("webinar_id", webinarId)
    .eq("is_active", true)
    .maybeSingle();

  if (!config) return NextResponse.json({ languages: [], segments: [] });

  const languages = (config.target_languages as string[]) ?? [];
  if (!lang || !languages.includes(lang)) {
    return NextResponse.json({ languages, sourceLanguage: config.source_language, segments: [] });
  }

  const { data: segments } = await supabase
    .from("translation_segments")
    .select("start_time_seconds, end_time_seconds, original_text, translations")
    .eq("webinar_id", webinarId)
    .order("start_time_seconds", { ascending: true });

  const captions = (segments ?? []).map((segment) => ({
    start: segment.start_time_seconds,
    end: segment.end_time_seconds,
    text: (segment.translations as Record<string, string>)[lang] ?? segment.original_text,
  }));

  return NextResponse.json({ languages, sourceLanguage: config.source_language, segments: captions });
}
