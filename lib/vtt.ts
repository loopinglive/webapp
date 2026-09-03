/**
 * A minimal WebVTT reader — just enough to turn a transcript into cues an LLM
 * can read alongside timestamps.
 *
 * Not a general parser: no styling blocks, no regions, no nested cue
 * settings. Cloudinary's auto-transcription output is plain, and this reads
 * exactly that shape rather than the whole spec.
 */

export type VttCue = {
  /** Seconds from the start of the video. */
  startSeconds: number;
  endSeconds: number;
  text: string;
};

function toSeconds(timestamp: string): number {
  // HH:MM:SS.mmm or MM:SS.mmm — Cloudinary always emits the first, but a
  // shorter form is valid WebVTT and worth not breaking on.
  const parts = timestamp.trim().split(":");
  const [seconds, ms = "0"] = (parts.pop() ?? "0").split(".");

  let total = Number(seconds) + Number(`0.${ms}`);
  if (parts.length) total += Number(parts.pop()) * 60; // minutes
  if (parts.length) total += Number(parts.pop()) * 3600; // hours

  return total;
}

export function parseVtt(source: string): VttCue[] {
  // Cues are separated by a blank line; normalise line endings first.
  const blocks = source.replace(/\r\n/g, "\n").split(/\n\n+/);
  const cues: VttCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").filter((line) => line.trim().length > 0);
    const timingLine = lines.find((line) => line.includes("-->"));
    if (!timingLine) continue;

    const [startRaw, endRaw] = timingLine.split("-->").map((part) => part.trim());
    if (!startRaw || !endRaw) continue;

    // Anything after the timing on its own line, minus a leading cue
    // identifier if the block had one (a bare line before the timing).
    const textLines = lines.slice(lines.indexOf(timingLine) + 1);
    const text = textLines.join(" ").trim();
    if (!text) continue;

    cues.push({
      startSeconds: toSeconds(startRaw),
      // The end timestamp can carry cue settings after a space; only the
      // leading token is the time.
      endSeconds: toSeconds(endRaw.split(/\s+/)[0]),
      text,
    });
  }

  return cues;
}

/**
 * Cues collapsed into rough thirty-second windows.
 *
 * A raw transcript is one cue every few seconds — too fine-grained to hand to
 * an LLM as "pick moments to comment", because almost every cue looks like a
 * plausible moment. Bucketing gives it something closer to what a human
 * skimming the transcript would actually see: a paragraph at a time.
 */
export function bucketCues(cues: VttCue[], windowSeconds = 30): { start: number; text: string }[] {
  if (cues.length === 0) return [];

  const buckets = new Map<number, string[]>();

  for (const cue of cues) {
    const bucket = Math.floor(cue.startSeconds / windowSeconds) * windowSeconds;
    const existing = buckets.get(bucket) ?? [];
    existing.push(cue.text);
    buckets.set(bucket, existing);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, texts]) => ({ start, text: texts.join(" ") }));
}
