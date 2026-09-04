"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

const TONES = [
  { id: "conversational", label: "Conversational" },
  { id: "professional", label: "Professional" },
  { id: "high_energy", label: "High Energy" },
  { id: "educational", label: "Educational" },
] as const;

const LENGTHS = [30, 45, 60, 90];

export function ScriptGenerator() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [price, setPrice] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("conversational");
  const [length, setLength] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!topic.trim()) return;
    setError(null);
    setGenerating(true);

    const response = await fetch("/api/script-writer/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        targetAudience: audience || undefined,
        offer: offer || undefined,
        price: price || undefined,
        tone,
        lengthMinutes: length,
      }),
    });
    const payload = (await response.json()) as { script?: { id: string }; error?: string };
    setGenerating(false);

    if (!response.ok || !payload.script) {
      setError(payload.error ?? "Could not generate a script.");
      return;
    }
    router.push(`/script-writer/${payload.script.id}`);
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-8 lg:px-10">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
        Write a webinar script
      </h1>
      <p className="mt-1.5 text-[13px] text-[#A0A0B0]">
        A full thirteen-section script, word for word — not an outline.
      </p>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-[12px] text-[#A0A0B0]">Topic</span>
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="How to scale a digital marketing agency to 7 figures"
            className="mt-1 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[12px] text-[#A0A0B0]">Target audience (optional)</span>
          <input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="Agency owners with 1–5 clients wanting to scale to 10+"
            className="mt-1 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] text-[#A0A0B0]">Offer (optional)</span>
            <input
              value={offer}
              onChange={(event) => setOffer(event.target.value)}
              placeholder="12-week group coaching"
              className="mt-1 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[12px] text-[#A0A0B0]">Price (optional)</span>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="$3,000"
              className="mt-1 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
            />
          </label>
        </div>

        <div>
          <span className="text-[12px] text-[#A0A0B0]">Tone</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TONES.map((option) => (
              <button
                key={option.id}
                onClick={() => setTone(option.id)}
                className={`h-8 rounded-full px-3 text-[12.5px] transition-colors ${
                  tone === option.id
                    ? "bg-[#6C47FF] text-white"
                    : "border border-[#1E1E2E] text-[#A0A0B0] hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[12px] text-[#A0A0B0]">Length</span>
          <div className="mt-1.5 flex gap-1.5">
            {LENGTHS.map((minutes) => (
              <button
                key={minutes}
                onClick={() => setLength(minutes)}
                className={`h-8 rounded-full px-3.5 text-[12.5px] transition-colors ${
                  length === minutes
                    ? "bg-[#6C47FF] text-white"
                    : "border border-[#1E1E2E] text-[#A0A0B0] hover:text-white"
                }`}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-[12.5px] text-[#FF5A5A]">{error}</p>}

        <button
          onClick={() => void generate()}
          disabled={generating || !topic.trim()}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6C47FF] px-4 text-[13.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {generating ? "Writing…" : "Generate script"}
        </button>
      </div>
    </div>
  );
}
