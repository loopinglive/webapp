import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

type RegistrantUpdate = Database["public"]["Tables"]["registrants"]["Update"];

export const dynamic = "force-dynamic";

const MAX_NOTES = 500;
const MAX_TAGS = 12;

// Private admin annotations — notes and tags. Never shown to the attendee.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ registrantId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { registrantId } = await params;
  const { notes, tags } = (await request.json()) as {
    notes?: string;
    tags?: string[];
  };

  const patch: RegistrantUpdate = {};

  if (typeof notes === "string") {
    if (notes.length > MAX_NOTES) {
      return NextResponse.json(
        { error: `Notes are limited to ${MAX_NOTES} characters.` },
        { status: 400 }
      );
    }
    patch.notes = notes.trim() || null;
  }

  if (Array.isArray(tags)) {
    const cleaned = [
      ...new Set(
        tags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
          .slice(0, MAX_TAGS)
      ),
    ];
    patch.tags = cleaned as Json;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("registrants")
    .update(patch)
    .eq("id", registrantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
