"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { useScript } from "@/hooks/useScriptWriter";
import { ScriptToWebinar } from "@/components/script-writer/ScriptToWebinar";

export function ScriptEditor({ scriptId }: { scriptId: string }) {
  const { script, sections, setSections, loading, notFound, saving, save } =
    useScript(scriptId);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (notFound) {
    return <div className="px-6 py-16 text-center text-[13px] text-ink-muted">Not found.</div>;
  }
  if (loading || !script) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  const active = sections.find((section) => section.key === activeKey) ?? sections[0];
  const totalWords = sections.reduce(
    (sum, section) => sum + section.content.trim().split(/\s+/).filter(Boolean).length,
    0
  );

  function updateActive(content: string) {
    setSections((current) =>
      current.map((section) => (section.key === active.key ? { ...section, content } : section))
    );
  }

  async function copyAll() {
    const text = sections.map((section) => `${section.title}\n\n${section.content}`).join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-6 px-6 py-6 lg:grid-cols-[220px_1fr] lg:px-10">
      <aside className="space-y-1">
        <h1 className="mb-3 truncate text-[15px] font-semibold text-ink">{script.title}</h1>
        <p className="mb-3 text-[11px] text-ink-faint">
          {script.webinar_length_minutes} min · {totalWords.toLocaleString()} words
        </p>
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => setActiveKey(section.key)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors ${
              active?.key === section.key
                ? "bg-accent/15 text-ink"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {section.title}
            <span className="ml-1.5 text-[10.5px] text-ink-faint">
              ~{section.estimatedMinutes}m
            </span>
          </button>
        ))}

        <div className="mt-4 space-y-2 border-t border-hairline pt-4">
          <button
            onClick={() => void copyAll()}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-hairline text-[11.5px] text-ink-muted hover:text-ink"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy full script"}
          </button>
          <ScriptToWebinar scriptId={scriptId} />
        </div>
      </aside>

      {active && (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">{active.title}</h2>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
          </div>
          <textarea
            value={active.content}
            onChange={(event) => updateActive(event.target.value)}
            onBlur={() => void save(sections)}
            rows={20}
            className="mt-3 w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-[13.5px] leading-relaxed text-ink focus:border-accent focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-ink-faint">
            Saves automatically when you click away from the text.
          </p>
        </div>
      )}
    </div>
  );
}
