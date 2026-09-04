import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(80).trim(),
});

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "team"
  );
}

/**
 * Creates a team, with the creator as its one and only owner.
 *
 * A user who already belongs to a team cannot start a second one — teams are
 * meant to be the account's collaboration surface, not something a member
 * accumulates several of, and `user_accounts.team_id` is a single column, not
 * a join table, so it can only ever point at one.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (account.team_id) {
    return NextResponse.json(
      { error: "You already belong to a team. Leave it before creating another." },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Give the team a name." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const base = slugify(parsed.data.name);

  // Slugs are unique; a collision gets a short numeric suffix rather than a
  // rejected request the host has to think about.
  let slug = base;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data: existing } = await supabase
      .from("teams")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({ owner_id: account.id, name: parsed.data.name, slug })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: account.id,
    role: "owner",
    status: "active",
    accepted_at: new Date().toISOString(),
  });

  await supabase
    .from("user_accounts")
    .update({ team_id: team.id, team_role: "owner" })
    .eq("id", account.id);

  return NextResponse.json({ team });
}
