import { NextResponse } from "next/server";
import { z } from "zod";

import { DEFAULT_STAGES, ensureDefaultPipeline } from "@/lib/crm/pipeline";
import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Creating the default on read means a host never sees an empty-state that
  // asks them to configure something before they can look at their leads.
  await ensureDefaultPipeline(account.id);

  const supabase = createServiceClient();
  const { data: pipelines } = await supabase
    .from("deal_pipelines")
    .select("id, name, stages, is_default, created_at")
    .eq("user_id", account.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ pipelines: pipelines ?? [], defaultStages: DEFAULT_STAGES });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  stages: z
    .array(z.object({ key: z.string().min(1).max(40), label: z.string().min(1).max(60), probability: z.number().int().min(0).max(100) }))
    .min(1)
    .max(10)
    .optional(),
});

export async function PATCH(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("deal_pipelines")
    .update({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.stages !== undefined && { stages: parsed.data.stages as unknown as Json }),
    })
    .eq("id", parsed.data.id)
    .eq("user_id", account.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
