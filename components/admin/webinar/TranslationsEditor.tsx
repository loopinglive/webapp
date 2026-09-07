"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { cn } from "@/lib/utils";

const COMMON_LANGUAGES: { code: string; label: string }[] = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
];

type Translation = {
  language_code: string;
  title: string | null;
  description: string | null;
  registration_headline: string | null;
  registration_subheadline: string | null;
  what_you_will_learn: string[];
  cta_button_text: string | null;
  auto_translated: boolean;
};

export function TranslationsEditor({ webinarId }: { webinarId: string }) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState<Translation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoTranslating, setAutoTranslating] = useState(false);

  async function load() {
    const response = await fetch(`/api/webinar/${webinarId}/translations`, { cache: "no-store" });
    if (response.ok) {
      const { translations: rows } = (await response.json()) as { translations: Translation[] };
      setTranslations(rows);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webinarId]);

  useEffect(() => {
    if (!active) {
      const timer = setTimeout(() => setDraft(null), 0);
      return () => clearTimeout(timer);
    }
    const existing = translations.find((t) => t.language_code === active);
    const timer = setTimeout(
      () =>
        setDraft(
          existing ?? {
            language_code: active,
            title: "",
            description: "",
            registration_headline: "",
            registration_subheadline: "",
            what_you_will_learn: [],
            cta_button_text: "",
            auto_translated: false,
          }
        ),
      0
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    await fetch(`/api/webinar/${webinarId}/translations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        languageCode: draft.language_code,
        title: draft.title || undefined,
        description: draft.description || undefined,
        registrationHeadline: draft.registration_headline || undefined,
        registrationSubheadline: draft.registration_subheadline || undefined,
        whatYouWillLearn: draft.what_you_will_learn,
        ctaButtonText: draft.cta_button_text || undefined,
      }),
    });
    setSaving(false);
    await load();
  }

  async function autoTranslate() {
    if (!active) return;
    setAutoTranslating(true);
    const response = await fetch(`/api/webinar/${webinarId}/translations/auto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ languageCode: active }),
    });
    setAutoTranslating(false);
    if (response.ok) await load();
  }

  async function remove(code: string) {
    await fetch(`/api/webinar/${webinarId}/translations?lang=${code}`, { method: "DELETE" });
    if (active === code) setActive(null);
    await load();
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  const availableToAdd = COMMON_LANGUAGES.filter(
    (lang) => !translations.some((t) => t.language_code === lang.code) && lang.code !== active
  );

  return (
    <>
      <SectionHeader
        title="Translations"
        description="Add a language, then write it yourself or let AI translate your registration page."
      />

      <div className="grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[200px_1fr] lg:px-8">
        <div className="space-y-1.5">
          {translations.map((t) => (
            <div
              key={t.language_code}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px]",
                active === t.language_code ? "bg-[#1E1E2E] text-white" : "text-[#A0A0B0] hover:bg-[#1A1A2A]"
              )}
            >
              <button onClick={() => setActive(t.language_code)} className="flex-1 text-left uppercase">
                {t.language_code}
              </button>
              <button onClick={() => remove(t.language_code)} className="text-[#A0A0B0] hover:text-[#FF3B3B]">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {availableToAdd.length > 0 && (
            <select
              value=""
              onChange={(event) => event.target.value && setActive(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-2.5 py-2 text-[12px] text-[#A0A0B0]"
            >
              <option value="">+ Add language</option>
              {availableToAdd.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {!draft ? (
          <p className="text-[12.5px] text-[#A0A0B0]">Pick or add a language to translate.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-white">
                {COMMON_LANGUAGES.find((l) => l.code === draft.language_code)?.label ?? draft.language_code}
                {draft.auto_translated && (
                  <span className="ml-2 rounded-full bg-[#6C47FF]/15 px-2 py-0.5 text-[10.5px] text-[#6C47FF]">
                    AI translated
                  </span>
                )}
              </p>
              <AdminButton variant="secondary" onClick={autoTranslate} disabled={autoTranslating}>
                {autoTranslating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Auto-translate
              </AdminButton>
            </div>

            <Field label="Registration headline">
              <TextInput
                value={draft.registration_headline ?? ""}
                onChange={(event) => setDraft({ ...draft, registration_headline: event.target.value })}
              />
            </Field>
            <Field label="Registration subheadline">
              <TextArea
                rows={2}
                value={draft.registration_subheadline ?? ""}
                onChange={(event) => setDraft({ ...draft, registration_subheadline: event.target.value })}
              />
            </Field>
            <Field label="What you'll learn" hint="One line per item">
              <TextArea
                rows={3}
                value={draft.what_you_will_learn.join("\n")}
                onChange={(event) =>
                  setDraft({ ...draft, what_you_will_learn: event.target.value.split("\n").filter(Boolean) })
                }
              />
            </Field>
            <Field label="Button text">
              <TextInput
                value={draft.cta_button_text ?? ""}
                onChange={(event) => setDraft({ ...draft, cta_button_text: event.target.value })}
              />
            </Field>
            <Field label="Page title">
              <TextInput
                value={draft.title ?? ""}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              />
            </Field>

            <AdminButton onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Save translation
            </AdminButton>
          </div>
        )}
      </div>
    </>
  );
}
