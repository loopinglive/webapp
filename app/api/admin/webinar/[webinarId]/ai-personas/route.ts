import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_BRIEF = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const [{ data: personas, error }, { data: webinar }] = await Promise.all([
    supabase
      .from("ai_personas")
      .select("*")
      .eq("webinar_id", webinarId)
      .order("created_at", { ascending: true }),
    supabase
      .from("webinars")
      .select("topic, offer_description, key_talking_points, objection_notes")
      .eq("id", webinarId)
      .maybeSingle(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ personas: personas ?? [], context: webinar ?? null });
}

type PersonaInput = {
  id?: string;
  personaName?: string;
  avatarUrl?: string | null;
  personalityBrief?: string;
  fakeCommentReplyPercentage?: number;
  isActive?: boolean;
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { personas, context } = (await request.json()) as {
    personas?: PersonaInput[];
    context?: {
      topic?: string;
      offerDescription?: string;
      keyTalkingPoints?: string;
      objectionNotes?: string;
    };
  };

  if (!personas?.length) {
    return NextResponse.json({ error: "No personas supplied." }, { status: 400 });
  }

  for (const persona of personas) {
    if (!persona.personaName?.trim()) {
      return NextResponse.json(
        { error: "Every moderator needs a name." },
        { status: 400 }
      );
    }
    if ((persona.personalityBrief?.trim().length ?? 0) === 0) {
      return NextResponse.json(
        { error: `Write a personality brief for ${persona.personaName}.` },
        { status: 400 }
      );
    }
    if ((persona.personalityBrief?.length ?? 0) > MAX_BRIEF) {
      return NextResponse.json(
        { error: `Keep briefs under ${MAX_BRIEF} characters.` },
        { status: 400 }
      );
    }
  }

  const supabase = createServiceClient();

  // The shared context lives on the webinar — both moderators read the same one.
  if (context) {
    await supabase
      .from("webinars")
      .update({
        topic: context.topic?.trim() || null,
        offer_description: context.offerDescription?.trim() || null,
        key_talking_points: context.keyTalkingPoints?.trim() || null,
        objection_notes: context.objectionNotes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", webinarId);
  }

  const saved = [];

  for (const persona of personas) {
    const row = {
      webinar_id: webinarId,
      persona_name: persona.personaName!.trim(),
      avatar_url: persona.avatarUrl?.trim() || null,
      personality_brief: persona.personalityBrief!.trim(),
      fake_comment_reply_percentage: Math.min(
        100,
        Math.max(0, Math.round(persona.fakeCommentReplyPercentage ?? 50))
      ),
      is_active: persona.isActive ?? true,
    };

    const { data, error } = persona.id
      ? await supabase
          .from("ai_personas")
          .update(row)
          .eq("id", persona.id)
          .eq("webinar_id", webinarId)
          .select("*")
          .single()
      : await supabase.from("ai_personas").insert(row).select("*").single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    saved.push(data);
  }

  return NextResponse.json({ personas: saved });
}
