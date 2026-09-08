import "server-only";

/**
 * ElevenLabs voice cloning and text-to-speech.
 *
 * Plain REST over fetch, matching this codebase's established pattern for
 * third-party payment providers (lib/payments/*) — a handful of documented
 * endpoints, not enough surface to justify a dependency this project can't
 * verify against a real account yet.
 */

const BASE_URL = "https://api.elevenlabs.io/v1";

export function elevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error("ElevenLabs is not configured on this deployment.");
  return key;
}

export type PremiumVoice = { id: string; name: string; gender: "male" | "female"; accent: string; previewUrl: string };

/** ElevenLabs' own general-purpose voices, stable IDs from their public library. */
export const PREMIUM_VOICES: PremiumVoice[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female", accent: "American", previewUrl: "" },
  { id: "29vD33N1CtxCmqQRPOHJ", name: "Drew", gender: "male", accent: "American", previewUrl: "" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", gender: "female", accent: "American", previewUrl: "" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", gender: "male", accent: "American", previewUrl: "" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", gender: "female", accent: "American", previewUrl: "" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", gender: "male", accent: "American", previewUrl: "" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", gender: "male", accent: "American", previewUrl: "" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "male", accent: "American", previewUrl: "" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", gender: "male", accent: "American", previewUrl: "" },
];

/** Clones a voice from an uploaded sample. Returns ElevenLabs' voice_id. */
export async function createVoiceClone(name: string, sampleUrl: string): Promise<string> {
  const sampleResponse = await fetch(sampleUrl);
  const sampleBlob = await sampleResponse.blob();

  const form = new FormData();
  form.append("name", name);
  form.append("files", sampleBlob, "sample.mp3");

  const response = await fetch(`${BASE_URL}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": apiKey() },
    body: form,
  });

  const payload = (await response.json()) as { voice_id?: string; detail?: { message?: string } };
  if (!response.ok || !payload.voice_id) {
    throw new Error(payload.detail?.message || "ElevenLabs could not create that voice clone.");
  }

  return payload.voice_id;
}

export async function deleteVoiceClone(voiceId: string): Promise<void> {
  await fetch(`${BASE_URL}/voices/${voiceId}`, {
    method: "DELETE",
    headers: { "xi-api-key": apiKey() },
  }).catch(() => {
    // Already gone, or ElevenLabs is unreachable — either way there is
    // nothing further to do locally once our own row is deleted.
  });
}

export type VoiceSettings = { stability?: number; similarityBoost?: number; style?: number };

/** Synthesises speech and returns the raw MP3 bytes — caller decides where they end up. */
export async function synthesiseSpeech(
  text: string,
  voiceId: string,
  settings?: VoiceSettings
): Promise<ArrayBuffer> {
  const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: settings?.stability ?? 0.5,
        similarity_boost: settings?.similarityBoost ?? 0.75,
        style: settings?.style ?? 0.5,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail?.message || "ElevenLabs could not synthesise that text.");
  }

  return response.arrayBuffer();
}
