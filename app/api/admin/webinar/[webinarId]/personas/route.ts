import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const [{ data: personas, error }, { data: comments }] = await Promise.all([
    supabase
      .from("fake_personas")
      .select("*")
      .eq("webinar_id", webinarId)
      .order("created_at", { ascending: true }),
    supabase
      .from("timed_comments")
      .select("persona_id")
      .eq("webinar_id", webinarId),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const commentCounts: Record<string, number> = {};
  for (const comment of comments ?? []) {
    commentCounts[comment.persona_id] = (commentCounts[comment.persona_id] ?? 0) + 1;
  }

  return NextResponse.json({ personas: personas ?? [], commentCounts });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const body = (await request.json()) as {
    name?: string;
    location?: string;
    avatarUrl?: string;
    /** CSV import: [{ name, location, avatar_url }] */
    bulk?: { name?: string; location?: string; avatar_url?: string }[];
  };

  const supabase = createServiceClient();

  if (body.bulk?.length) {
    const rows = body.bulk
      .map((row) => ({
        webinar_id: webinarId,
        name: row.name?.trim() ?? "",
        location: row.location?.trim() || null,
        avatar_url: row.avatar_url?.trim() || null,
      }))
      .filter((row) => row.name);

    if (!rows.length) {
      return NextResponse.json(
        { error: "No rows with a name were found." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("fake_personas")
      .insert(rows)
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ personas: data, imported: data?.length ?? 0 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fake_personas")
    .insert({
      webinar_id: webinarId,
      name,
      location: body.location?.trim() || null,
      avatar_url: body.avatarUrl?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ persona: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { personaId, name, location, avatarUrl } = (await request.json()) as {
    personaId?: string;
    name?: string;
    location?: string | null;
    avatarUrl?: string | null;
  };

  if (!personaId || !name?.trim()) {
    return NextResponse.json(
      { error: "personaId and a name are required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fake_personas")
    .update({
      name: name.trim(),
      location: location?.trim() || null,
      avatar_url: avatarUrl?.trim() || null,
    })
    .eq("id", personaId)
    .eq("webinar_id", webinarId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ persona: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const url = new URL(request.url);
  const personaId = url.searchParams.get("personaId");
  const all = url.searchParams.get("all") === "true";

  const supabase = createServiceClient();

  // Deleting a persona cascades to their scripted comments.
  const query = supabase.from("fake_personas").delete().eq("webinar_id", webinarId);
  const { error } = all ? await query : await query.eq("id", personaId ?? "");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
