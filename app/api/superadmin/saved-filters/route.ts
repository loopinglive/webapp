import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCapability } from "@/lib/billing/admin-roles";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Saved views on the user list.
 *
 * Per-admin rather than shared: the three or four filters someone reaches for
 * daily are a reflection of their job, and a support person's "suspended, last
 * seen over 30 days ago" is noise on a finance person's screen.
 */
export async function GET() {
  const { account: admin, response: denied } = await requireCapability("view_customers");
  if (denied) return denied;

  const { data } = await createServiceClient()
    .from("saved_filters")
    .select("id, name, query, created_at")
    .eq("owner_id", admin.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ filters: data ?? [] });
}

const schema = z.object({
  name: z.string().min(1).max(60).trim(),
  // The list's own query string. Capped so a saved view cannot become a
  // storage vector.
  query: z.string().max(500),
});

export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireCapability("view_customers");
  if (denied) return denied;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Give the view a name." }, { status: 422 });
  }

  const supabase = createServiceClient();

  // Ten is past the point where a row of chips is still scannable, which is
  // the only reason they are worth saving.
  const { count } = await supabase
    .from("saved_filters")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", admin.id);

  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: "Ten saved views is the limit. Delete one first." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("saved_filters")
    .insert({
      owner_id: admin.id,
      name: parsed.data.name,
      query: parsed.data.query,
    })
    .select("id, name, query, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ filter: data });
}

export async function DELETE(request: Request) {
  const { account: admin, response: denied } = await requireCapability("view_customers");
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Scoped to the owner, so an id from another admin's list deletes nothing.
  await createServiceClient()
    .from("saved_filters")
    .delete()
    .eq("id", id)
    .eq("owner_id", admin.id);

  return NextResponse.json({ success: true });
}
