import type { Metadata } from "next";

import { VoiceCloneStudio } from "@/components/voice-clone/VoiceCloneStudio";

export const metadata: Metadata = { title: "Voice cloning" };
export const dynamic = "force-dynamic";

export default function VoiceClonePage() {
  return <VoiceCloneStudio />;
}
