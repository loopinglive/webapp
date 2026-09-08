import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { cloudinary } from "@/lib/cloudinary";
import { createVoiceClone, elevenLabsConfigured } from "@/lib/voice/elevenlabs";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_CLONES_PER_ACCOUNT = 5;
const MIN_SAMPLE_SECONDS = 25;

/**
 * Turns an uploaded sample into a usable clone. ElevenLabs' own /voices/add
 * call is synchronous — it returns a working voice_id in the same request,
 * so there is no separate "processing" job to poll; the row is created
 * "ready" outright rather than "processing" then flipped later.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (account.is_suspended) return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });

  if (!elevenLabsConfigured()) {
    return NextResponse.json({ error: "Voice cloning is not configured on this deployment." }, { status: 503 });
  }

  const { publicId, cloneName } = (await request.json().catch(() => ({}))) as {
    publicId?: string;
    cloneName?: string;
  };
  if (!publicId || !cloneName?.trim()) {
    return NextResponse.json({ error: "publicId and cloneName are required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { count } = await supabase
    .from("voice_clones")
    .select("id", { count: "exact", head: true })
    .eq("user_id", account.id);
  if ((count ?? 0) >= MAX_CLONES_PER_ACCOUNT) {
    return NextResponse.json({ error: `You can have at most ${MAX_CLONES_PER_ACCOUNT} cloned voices.` }, { status: 429 });
  }

  let asset;
  try {
    asset = await cloudinary.api.resource(publicId, { resource_type: "video", media_metadata: true });
  } catch {
    return NextResponse.json({ error: "That upload could not be verified. Please try again." }, { status: 400 });
  }

  const duration = Math.round(Number(asset.duration ?? 0));
  if (duration < MIN_SAMPLE_SECONDS) {
    return NextResponse.json(
      { error: `That sample is too short — ElevenLabs needs at least ${MIN_SAMPLE_SECONDS} seconds of clean speech.` },
      { status: 400 }
    );
  }

  let voiceId: string;
  try {
    voiceId = await createVoiceClone(cloneName.trim(), asset.secure_url as string);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ElevenLabs could not create that voice clone." },
      { status: 502 }
    );
  }

  const { data: clone, error } = await supabase
    .from("voice_clones")
    .insert({
      user_id: account.id,
      clone_name: cloneName.trim(),
      provider: "elevenlabs",
      provider_voice_id: voiceId,
      sample_audio_url: asset.secure_url as string,
      status: "ready",
      is_primary: (count ?? 0) === 0,
    })
    .select("id, clone_name, provider_voice_id, status, is_primary, created_at")
    .single();

  if (error || !clone) {
    return NextResponse.json({ error: error?.message ?? "Could not save the voice clone." }, { status: 500 });
  }

  return NextResponse.json({ clone });
}
