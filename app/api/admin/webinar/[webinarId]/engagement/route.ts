import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { EngagementKind } from "@/types";

export const dynamic = "force-dynamic";

const TABLES = {
  poll: "timed_polls",
  handout: "timed_handouts",
  cta: "timed_ctas",
  pinned: "timed_pinned_messages",
} as const;

function tableFor(kind: string | null) {
  if (kind && kind in TABLES) return TABLES[kind as EngagementKind];
  return null;
}

// All four engagement types share a shape — a webinar, a video offset, and a
// payload — so they share a route rather than four near-identical ones.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const [polls, handouts, ctas, pinned] = await Promise.all(
    (Object.values(TABLES) as string[]).map((table) =>
      supabase
        .from(table)
        .select("*")
        .eq("webinar_id", webinarId)
        .order("video_offset_seconds", { ascending: true })
    )
  );

  return NextResponse.json({
    polls: polls.data ?? [],
    handouts: handouts.data ?? [],
    ctas: ctas.data ?? [],
    pinned: pinned.data ?? [],
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { kind, values } = (await request.json()) as {
    kind?: EngagementKind;
    values?: Record<string, unknown>;
  };

  const table = tableFor(kind ?? null);
  if (!table || !values) {
    return NextResponse.json(
      { error: "A valid kind and values are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(table)
    .insert({ ...values, webinar_id: webinarId } as never)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { kind, id, values } = (await request.json()) as {
    kind?: EngagementKind;
    id?: string;
    values?: Record<string, unknown>;
  };

  const table = tableFor(kind ?? null);
  if (!table || !id || !values) {
    return NextResponse.json(
      { error: "kind, id and values are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from(table)
    .update(values as never)
    .eq("id", id)
    .eq("webinar_id", webinarId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const url = new URL(request.url);
  const table = tableFor(url.searchParams.get("kind"));
  const id = url.searchParams.get("id");

  if (!table || !id) {
    return NextResponse.json({ error: "kind and id are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("webinar_id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
