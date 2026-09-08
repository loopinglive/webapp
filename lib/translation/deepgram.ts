import "server-only";

/**
 * Deepgram pre-recorded transcription — used as a fallback source of caption
 * text for a webinar whose video has no script attached (an uploaded
 * recording, not one written in the script writer or generated
 * autonomously). Most webinars on this platform DO have a script, so
 * translation generation prefers that text directly and only reaches here
 * when it doesn't.
 *
 * This deliberately does not attempt Deepgram's real-time streaming
 * WebSocket API. That API authenticates with an `Authorization` header,
 * which only a server-side WebSocket client can set — a browser's own
 * WebSocket constructor cannot send custom headers, and Deepgram's SDK
 * (checked directly: it passes `headers` into the same client used
 * server-side in Node) has no browser-safe alternative documented. Turning
 * that into genuine live translation of an actually-live broadcast would
 * need a persistent server process relaying browser audio to Deepgram over
 * its own authenticated connection — which this Vercel serverless
 * deployment cannot host (no long-lived processes, no WebSocket upgrade in
 * a function). That is a real infrastructure gap, not a "not implemented
 * yet" — the same category as the mobile app builder's CI/publishing
 * requirement, and it is left honestly unbuilt rather than faked.
 */

export function deepgramConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY?.trim());
}

export type TranscriptUtterance = { text: string; startSeconds: number; endSeconds: number };

/** Transcribes an already-hosted audio/video URL (e.g. a Cloudinary webinar video) into timed utterances. */
export async function transcribeAudioUrl(url: string): Promise<TranscriptUtterance[]> {
  const key = process.env.DEEPGRAM_API_KEY?.trim();
  if (!key) throw new Error("Transcription is not configured on this deployment.");

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&utterances=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    }
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.err_msg || "Deepgram could not transcribe that recording.");
  }

  const payload = (await response.json()) as {
    results?: { utterances?: { transcript: string; start: number; end: number }[] };
  };

  return (payload.results?.utterances ?? []).map((utterance) => ({
    text: utterance.transcript,
    startSeconds: utterance.start,
    endSeconds: utterance.end,
  }));
}
