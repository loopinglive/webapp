"use client";

import { useCallback, useEffect, useState } from "react";

export type ScriptSection = {
  key: string;
  title: string;
  estimatedMinutes: number;
  content: string;
};

export type Script = {
  id: string;
  title: string;
  topic: string;
  webinar_length_minutes: number;
  status: string;
  webinar_id: string | null;
  created_at: string;
  updated_at: string;
};

export function useScriptList() {
  const [scripts, setScripts] = useState<Script[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/script-writer", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { scripts: Script[] };
      setScripts(payload.scripts);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return { scripts, refresh: load };
}

export function useScript(scriptId: string) {
  const [script, setScript] = useState<Script | null>(null);
  const [sections, setSections] = useState<ScriptSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/script-writer/${scriptId}`, { cache: "no-store" });
    if (response.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (response.ok) {
      const payload = (await response.json()) as {
        script: Script & { script_content: { sections?: ScriptSection[] } };
      };
      setScript(payload.script);
      setSections(payload.script.script_content?.sections ?? []);
    }
    setLoading(false);
  }, [scriptId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const save = useCallback(
    async (nextSections: ScriptSection[], title?: string) => {
      setSaving(true);
      const response = await fetch(`/api/script-writer/${scriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: nextSections, ...(title ? { title } : {}) }),
      });
      setSaving(false);
      if (response.ok) setSections(nextSections);
      return response.ok;
    },
    [scriptId]
  );

  return { script, sections, setSections, loading, notFound, saving, save, refresh: load };
}
