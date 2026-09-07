import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

export const dynamic = "force-dynamic";

/** Public — the on-demand/replay player reads chapters without the host being signed in. */
export async function GET(request: Request) {
  const webinarId = new URL(request.url).searchParams.get("webinarId");
  if (!webinarId) return NextResponse.json({ error: "webinarId is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("video_chapters")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("start_seconds", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chapters: data ?? [] });
}

const createSchema = z.object({
  webinarId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  startSeconds: z.number().int().min(0),
  endSeconds: z.number().int().min(0),
  description: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  if (parsed.data.endSeconds <= parsed.data.startSeconds) {
    return NextResponse.json({ error: "End must be after start." }, { status: 422 });
  }

  const access = await requireWebinarAccess(parsed.data.webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("video_chapters")
    .insert({
      webinar_id: parsed.data.webinarId,
      title: parsed.data.title,
      start_seconds: parsed.data.startSeconds,
      end_seconds: parsed.data.endSeconds,
      description: parsed.data.description ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chapter: data });
}

export async function DELETE(request: Request) {
  const { chapterId, webinarId } = (await request.json().catch(() => ({}))) as {
    chapterId?: string;
    webinarId?: string;
  };
  if (!chapterId || !webinarId) {
    return NextResponse.json({ error: "chapterId and webinarId are required" }, { status: 400 });
  }

  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;

  const supabase = createServiceClient();
  await supabase.from("video_chapters").delete().eq("id", chapterId).eq("webinar_id", webinarId);

  return NextResponse.json({ success: true });
}
