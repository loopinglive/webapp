import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { elevenLabsConfigured, synthesiseSpeech } from "@/lib/voice/elevenlabs";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SAMPLE_MAX_CHARS = 500;

/** Synthesises a short sample line and streams the audio straight back — nothing is stored. */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!elevenLabsConfigured()) {
    return NextResponse.json({ error: "Voice synthesis is not configured on this deployment." }, { status: 503 });
  }

  const { voiceCloneId, text } = (await request.json().catch(() => ({}))) as {
    voiceCloneId?: string;
    text?: string;
  };
  if (!voiceCloneId || !text?.trim()) {
    return NextResponse.json({ error: "voiceCloneId and text are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: clone } = await supabase
    .from("voice_clones")
    .select("provider_voice_id, user_id, status")
    .eq("id", voiceCloneId)
    .maybeSingle();

  if (!clone || clone.user_id !== account.id) {
    return NextResponse.json({ error: "Voice clone not found." }, { status: 404 });
  }
  if (clone.status !== "ready") {
    return NextResponse.json({ error: "This voice clone isn't ready yet." }, { status: 400 });
  }

  try {
    const audio = await synthesiseSpeech(text.trim().slice(0, SAMPLE_MAX_CHARS), clone.provider_voice_id);
    return new NextResponse(audio, { headers: { "Content-Type": "audio/mpeg" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not synthesise that text." },
      { status: 502 }
    );
  }
}
