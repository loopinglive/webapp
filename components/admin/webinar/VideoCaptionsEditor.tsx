"use client";

import { useEffect, useState } from "react";
import { Captions, Loader2, Sparkles, Trash2 } from "lucide-react";

import { AdminButton } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";

const LANGUAGES = [
  { code: "ES", label: "Spanish" },
  { code: "FR", label: "French" },
  { code: "DE", label: "German" },
  { code: "PT-BR", label: "Portuguese (Brazil)" },
  { code: "IT", label: "Italian" },
  { code: "NL", label: "Dutch" },
  { code: "PL", label: "Polish" },
  { code: "RU", label: "Russian" },
  { code: "JA", label: "Japanese" },
  { code: "ZH", label: "Chinese (simplified)" },
  { code: "AR", label: "Arabic" },
  { code: "HI", label: "Hindi" },
  { code: "TR", label: "Turkish" },
  { code: "KO", label: "Korean" },
] as const;

type Config = {
  source_language: string;
  target_languages: string[];
  transcription_provider: string;
  translation_provider: string;
  created_at: string;
} | null;

/**
 * Translates the video's captions once, from the script (or, for a video
 * with no script, Deepgram transcription of the recording) — not a live
 * transcription feed. Almost every showing of a webinar here replays the
 * same pre-recorded video, so generating captions once and reusing them
 * across every scheduled session is what actually matches how this platform
 * is used; see lib/translation/deepgram.ts for why true live-broadcast
 * captioning isn't built.
 */
export function VideoCaptionsEditor({ webinarId }: { webinarId: string }) {
  const [config, setConfig] = useState<Config>(null);
  const [segmentCount, setSegmentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/translation?webinarId=${webinarId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { config: Config; segmentCount: number };
      setConfig(payload.config);
      setSegmentCount(payload.segmentCount);
      if (payload.config) setSelected(payload.config.target_languages);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webinarId]);

  async function generate() {
    if (selected.length === 0) return;
    setGenerating(true);
    setError(null);

    const response = await fetch("/api/translation/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, targetLanguages: selected }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setGenerating(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not generate captions.");
      return;
    }
    await load();
  }

  async function remove() {
    await fetch("/api/translation", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId }),
    });
    setConfig(null);
    setSegmentCount(0);
    setSelected([]);
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        title="Video Captions"
        description="Translate the video's narration into other languages — attendees pick a caption language on the watch page."
      />

      <div className="max-w-2xl space-y-5 px-6 py-8 lg:px-8">
        {config && (
          <div className="flex items-center justify-between rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <Captions className="h-4 w-4 text-[#6C47FF]" />
              <span className="text-[13px] text-white">
                {segmentCount} caption segments in {config.target_languages.join(", ")}
              </span>
            </div>
            <button
              onClick={() => void remove()}
              title="Delete captions"
              className="grid h-8 w-8 place-items-center rounded-lg text-[#A0A0B0] transition-colors hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div>
          <span className="text-[12.5px] text-[#A0A0B0]">Target languages</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {LANGUAGES.map((language) => {
              const active = selected.includes(language.code);
              return (
                <button
                  key={language.code}
                  onClick={() =>
                    setSelected((current) =>
                      active ? current.filter((code) => code !== language.code) : [...current, language.code]
                    )
                  }
                  className={`h-8 rounded-full px-3 text-[12.5px] transition-colors ${
                    active ? "bg-[#6C47FF] text-white" : "border border-[#1E1E2E] text-[#A0A0B0] hover:text-white"
                  }`}
                >
                  {language.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-[12.5px] text-[#FF3B3B]">{error}</p>}

        <AdminButton onClick={() => void generate()} disabled={selected.length === 0 || generating}>
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generating ? "Translating…" : config ? "Regenerate captions" : "Generate captions"}
        </AdminButton>
      </div>
    </>
  );
}
