"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Wand2 } from "lucide-react";

import { useVoiceOptions } from "@/hooks/useAutonomousBuilder";

const NICHES = ["Business", "Health", "Relationships", "Finance", "Education", "Tech", "Spirituality", "Other"] as const;
const TONES = [
  { id: "inspirational", label: "Inspirational" },
  { id: "educational", label: "Educational" },
  { id: "direct", label: "Direct" },
  { id: "conversational", label: "Conversational" },
  { id: "high_energy", label: "High Energy" },
] as const;
const LENGTHS = [30, 45, 60, 90] as const;
const THEMES = [
  { id: "dark_professional", label: "Dark Professional" },
  { id: "light_corporate", label: "Light Corporate" },
  { id: "bold_colourful", label: "Bold & Colourful" },
  { id: "minimal_clean", label: "Minimal Clean" },
] as const;

/**
 * The entire input surface for the autonomous pipeline: five business facts
 * plus presentation preferences. Everything after "Generate" — script,
 * slides, narration, video, personas, and automation — runs unattended.
 */
export function AutonomousBuilder() {
  const router = useRouter();
  const { voices, configured: voiceConfigured } = useVoiceOptions();

  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [price, setPrice] = useState("");
  const [niche, setNiche] = useState<(typeof NICHES)[number]>("Business");
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("conversational");
  const [lengthMinutes, setLengthMinutes] = useState<(typeof LENGTHS)[number]>(60);
  const [theme, setTheme] = useState<(typeof THEMES)[number]["id"]>("dark_professional");
  const [voiceId, setVoiceId] = useState<string | null>(null);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = topic.trim().length >= 3 && audience.trim().length >= 3 && offer.trim().length >= 3;

  async function start() {
    if (!ready || starting) return;
    setStarting(true);
    setError(null);

    const response = await fetch("/api/autonomous/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        audience,
        offer,
        price,
        niche,
        lengthMinutes,
        tone,
        theme,
        voiceId,
        voiceCloneId: null,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { webinarId?: string; error?: string };
    setStarting(false);

    if (!response.ok || !payload.webinarId) {
      setError(payload.error ?? "Could not start generation.");
      return;
    }
    router.push(`/autonomous/${payload.webinarId}/status`);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 lg:px-10">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent-soft">
          <Wand2 className="h-4 w-4" />
        </span>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Autonomous webinar builder</h1>
      </div>
      <p className="mt-2 text-[13px] text-ink-muted">
        Give it a topic and an offer. It writes the script, builds the slides, records the voice-over,
        assembles the video, generates a live audience, and configures follow-up — as a draft you review
        before anything goes out.
      </p>

      <div className="mt-7 space-y-4">
        <label className="block">
          <span className="text-[12.5px] text-ink-muted">Topic</span>
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="How to scale a digital marketing agency to 7 figures"
            className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[13.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>

        <label className="block">
          <span className="text-[12.5px] text-ink-muted">Target audience</span>
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="Agency owners with 1–5 clients wanting to scale to 10+"
            className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[13.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12.5px] text-ink-muted">Offer</span>
            <input
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              placeholder="12-week group coaching"
              className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[13.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="block">
            <span className="text-[12.5px] text-ink-muted">Price (optional)</span>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="$997"
              className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[13.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
        </div>

        <div>
          <span className="text-[12.5px] text-ink-muted">Niche</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {NICHES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setNiche(option)}
                className={`h-8 rounded-full px-3 text-[12.5px] transition-colors ${
                  niche === option ? "bg-accent text-white" : "border border-hairline text-ink-muted hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[12.5px] text-ink-muted">Tone</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TONES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTone(option.id)}
                className={`h-8 rounded-full px-3 text-[12.5px] transition-colors ${
                  tone === option.id ? "bg-accent text-white" : "border border-hairline text-ink-muted hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-[12.5px] text-ink-muted">Length</span>
            <div className="mt-1.5 flex gap-1.5">
              {LENGTHS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setLengthMinutes(minutes)}
                  className={`h-8 flex-1 rounded-lg text-[12.5px] transition-colors ${
                    lengthMinutes === minutes
                      ? "bg-accent text-white"
                      : "border border-hairline text-ink-muted hover:text-ink"
                  }`}
                >
                  {minutes}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[12.5px] text-ink-muted">Slide theme</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as (typeof THEMES)[number]["id"])}
              className="mt-1.5 h-8 w-full rounded-lg border border-hairline bg-surface px-2.5 text-[12.5px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {THEMES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className="text-[12.5px] text-ink-muted">Presenter voice</span>
          {voiceConfigured ? (
            <select
              value={voiceId ?? ""}
              onChange={(event) => setVoiceId(event.target.value || null)}
              className="mt-1.5 h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option value="">Default voice</option>
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} — {voice.gender}, {voice.accent}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1.5 rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[12.5px] text-ink-faint">
              Voice synthesis isn&rsquo;t configured on this deployment yet — generation will stop after the
              slides step until it is.
            </p>
          )}
        </div>

        {error && <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>}

        <button
          onClick={() => void start()}
          disabled={!ready || starting}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {starting ? "Starting…" : "Generate webinar"}
        </button>
      </div>
    </div>
  );
}
