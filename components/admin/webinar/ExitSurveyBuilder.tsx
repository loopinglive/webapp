"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { cn } from "@/lib/utils";

type QuestionType = "multiple_choice" | "rating" | "text" | "yes_no" | "nps";

type Question = {
  id: string;
  type: QuestionType;
  label: string;
  options?: string[];
};

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  rating: "Rating (1-5)",
  text: "Open text",
  yes_no: "Yes / no",
  nps: "NPS (0-10)",
};

function blankQuestion(): Question {
  return { id: crypto.randomUUID(), type: "rating", label: "" };
}

export function ExitSurveyBuilder({ webinarId }: { webinarId: string }) {
  const [title, setTitle] = useState("Quick Question Before You Go");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<{ total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [surveyRes, resultsRes] = await Promise.all([
        fetch(`/api/webinar/${webinarId}/exit-survey`, { cache: "no-store" }),
        fetch(`/api/webinar/${webinarId}/exit-survey/results`, { cache: "no-store" }),
      ]);
      const surveyPayload = await surveyRes.json();
      const resultsPayload = await resultsRes.json();
      if (surveyPayload.survey) {
        setTitle(surveyPayload.survey.title);
        setQuestions(surveyPayload.survey.questions ?? []);
      }
      setResults(resultsPayload);
      setLoading(false);
    })();
  }, [webinarId]);

  async function save() {
    setSaving(true);
    await fetch(`/api/webinar/${webinarId}/exit-survey`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, questions, is_active: true }),
    });
    setSaving(false);
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        title="Exit survey"
        description="Shown for a moment when the video ends. Turn it on from the Advanced tab."
        action={
          <AdminButton onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </AdminButton>
        }
      />

      <div className="max-w-2xl space-y-6 px-6 py-8 lg:px-8">
        {results && (
          <p className="text-[12.5px] text-ink-muted">
            {results.total} response{results.total === 1 ? "" : "s"} so far.
          </p>
        )}

        <Field label="Survey title">
          <TextInput value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>

        <div className="space-y-3">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-lg border border-surface-3 bg-surface-2 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-ink-muted">Question {index + 1}</span>
                <button
                  type="button"
                  onClick={() => setQuestions((prev) => prev.filter((q) => q.id !== question.id))}
                  className="text-ink-muted hover:text-[#FF3B3B]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <TextInput
                placeholder="What would you like to ask?"
                value={question.label}
                onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
              />

              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(TYPE_LABELS) as QuestionType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateQuestion(question.id, { type })}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[11.5px] transition-colors",
                      question.type === type
                        ? "border-accent bg-accent/15 text-ink"
                        : "border-surface-3 text-ink-muted hover:border-surface-3"
                    )}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              {question.type === "multiple_choice" && (
                <TextInput
                  placeholder="Comma-separated options"
                  value={(question.options ?? []).join(", ")}
                  onChange={(event) =>
                    updateQuestion(question.id, {
                      options: event.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>

        {questions.length < 5 && (
          <button
            type="button"
            onClick={() => setQuestions((prev) => [...prev, blankQuestion()])}
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:text-accent-soft"
          >
            <Plus className="h-3.5 w-3.5" /> Add question
          </button>
        )}
      </div>
    </>
  );
}
