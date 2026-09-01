import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response: denied } = await requireAdmin();
  if (denied) return denied;

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    topic?: string;
    offerDescription?: string;
    webinarContext?: string;
  };

  const title = body.title?.trim();
  const description = body.description?.trim();

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("webinars")
    .insert({
      owner_id: user.id,
      title,
      description,
      topic: body.topic?.trim() || null,
      offer_description: body.offerDescription?.trim() || null,
      webinar_context: body.webinarContext?.trim() || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ webinarId: data.id });
}
