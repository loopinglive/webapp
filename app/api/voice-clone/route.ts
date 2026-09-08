import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { deleteVoiceClone } from "@/lib/voice/elevenlabs";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: clones } = await supabase
    .from("voice_clones")
    .select("id, clone_name, provider_voice_id, status, is_primary, created_at")
    .eq("user_id", account.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ clones: clones ?? [] });
}

export async function DELETE(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: clone } = await supabase
    .from("voice_clones")
    .select("id, provider_voice_id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!clone || clone.user_id !== account.id) {
    return NextResponse.json({ error: "Voice clone not found." }, { status: 404 });
  }

  await deleteVoiceClone(clone.provider_voice_id);
  await supabase.from("voice_clones").delete().eq("id", id);

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: clone } = await supabase.from("voice_clones").select("id, user_id").eq("id", id).maybeSingle();
  if (!clone || clone.user_id !== account.id) {
    return NextResponse.json({ error: "Voice clone not found." }, { status: 404 });
  }

  // Only one primary per account — the builder defaults to whichever clone
  // is primary, so making a new one primary demotes the current one.
  await supabase.from("voice_clones").update({ is_primary: false }).eq("user_id", account.id);
  await supabase.from("voice_clones").update({ is_primary: true }).eq("id", id);

  return NextResponse.json({ success: true });
}
