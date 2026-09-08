import { NextResponse } from "next/server";

import { requireAccountAccess } from "@/lib/webinar-access";
import { PREMIUM_VOICES, elevenLabsConfigured } from "@/lib/voice/elevenlabs";

export const dynamic = "force-dynamic";

/** The builder's voice picker — server-only module, so the client fetches the list rather than importing it. */
export async function GET() {
  const access = await requireAccountAccess();
  if (!access.ok) return access.response;

  return NextResponse.json({ voices: PREMIUM_VOICES, configured: elevenLabsConfigured() });
}
