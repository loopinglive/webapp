import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json, WebinarScriptRow } from "@/types/database";

export const dynamic = "force-dynamic";

async function ownedScript(
  supabase: ReturnType<typeof createServiceClient>,
  scriptId: string,
  userId: string
) {
  const { data } = await supabase
    .from("webinar_scripts")
    .select("id, user_id")
    .eq("id", scriptId)
    .maybeSingle();
  return data && data.user_id === userId ? data : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ scriptId: string }> }
) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { scriptId } = await params;
  const supabase = createServiceClient();

  const { data: script } = await supabase
    .from("webinar_scripts")
    .select("*")
    .eq("id", scriptId)
    .eq("user_id", account.id)
    .maybeSingle();

  if (!script) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ script });
}

const schema = z.object({
  title: z.string().max(160).trim().optional(),
  sections: z
    .array(
      z.object({
        key: z.string(),
        title: z.string(),
        estimatedMinutes: z.number(),
        content: z.string().max(20000),
      })
    )
    .optional(),
  status: z.enum(["draft", "final"]).optional(),
});

/** Saves an edit — a section rewritten by hand, a regenerated section, or a title change. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ scriptId: string }> }
) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { scriptId } = await params;
  const supabase = createServiceClient();

  const owned = await ownedScript(supabase, scriptId, account.id);
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const patch: Partial<WebinarScriptRow> = { updated_at: new Date().toISOString() };
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.sections !== undefined) {
    patch.script_content = { sections: parsed.data.sections } as unknown as Json;
  }
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;

  const { data, error } = await supabase
    .from("webinar_scripts")
    .update(patch)
    .eq("id", scriptId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ script: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ scriptId: string }> }
) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { scriptId } = await params;
  const supabase = createServiceClient();

  const owned = await ownedScript(supabase, scriptId, account.id);
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await supabase.from("webinar_scripts").delete().eq("id", scriptId);
  return NextResponse.json({ success: true });
}
