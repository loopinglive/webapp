import { NextResponse } from "next/server";
import { z } from "zod";

import { requireTeamCapability } from "@/lib/teams/auth";
import type { TeamRow } from "@/types/database";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(80).trim().optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  // Settings sit next to billing conceptually, but a name/logo change is not
  // a money decision — gated on membership itself, not manage_billing.
  const { response: denied } = await requireTeamCapability(teamId, "manage_members");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const patch: Partial<TeamRow> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.logoUrl !== undefined) patch.logo_url = parsed.data.logoUrl;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("teams")
    .update(patch)
    .eq("id", teamId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ team: data });
}
