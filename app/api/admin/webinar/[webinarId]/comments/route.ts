import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type CommentUpdate = Database["public"]["Tables"]["timed_comments"]["Update"];

export const dynamic = "force-dynamic";

/** Postgres unique_violation — the persona already speaks at this second. */
const DUPLICATE = "23505";

const clash = () =>
  NextResponse.json(
    { error: "That persona already has a comment at this timestamp." },
    { status: 409 }
  );

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("timed_comments")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("video_offset_seconds", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { personaId, content, offsetSeconds } = (await request.json()) as {
    personaId?: string;
    content?: string;
    offsetSeconds?: number;
  };

  if (!personaId || !content?.trim() || typeof offsetSeconds !== "number") {
    return NextResponse.json(
      { error: "personaId, content and offsetSeconds are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("timed_comments")
    .insert({
      webinar_id: webinarId,
      persona_id: personaId,
      content: content.trim(),
      video_offset_seconds: Math.max(0, Math.round(offsetSeconds)),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === DUPLICATE) return clash();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comment: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { commentId, content, offsetSeconds, personaId } =
    (await request.json()) as {
      commentId?: string;
      content?: string;
      offsetSeconds?: number;
      personaId?: string;
    };

  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const patch: CommentUpdate = {};
  if (typeof content === "string") patch.content = content.trim();
  if (typeof offsetSeconds === "number") {
    patch.video_offset_seconds = Math.max(0, Math.round(offsetSeconds));
  }
  if (personaId) patch.persona_id = personaId;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("timed_comments")
    .update(patch)
    .eq("id", commentId)
    .eq("webinar_id", webinarId)
    .select("*")
    .single();

  if (error) {
    if (error.code === DUPLICATE) return clash();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comment: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const commentId = new URL(request.url).searchParams.get("commentId");

  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("timed_comments")
    .delete()
    .eq("id", commentId)
    .eq("webinar_id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
