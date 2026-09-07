"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type QuestionType = "multiple_choice" | "rating" | "text" | "yes_no" | "nps";

type Question = {
  id: string;
  type: QuestionType;
  label: string;
  options?: string[];
};

export function ExitSurveyModal({
  webinarId,
  registrantId,
  sessionId,
  title,
  questions,
  onDone,
}: {
  webinarId: string;
  registrantId: string;
  sessionId: string | null;
  title: string;
  questions: Question[];
  onDone: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    await fetch(`/api/webinar/${webinarId}/exit-survey/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrantId, sessionId, responses: answers }),
    }).catch(() => {});
    setSubmitting(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/8 bg-[#12121A] p-6">
        <h2 className="text-[17px] font-semibold text-white">{title}</h2>

        <div className="mt-5 space-y-5">
          {questions.map((question) => (
            <div key={question.id}>
              <p className="mb-2 text-[13.5px] text-[#E5E5EA]">{question.label}</p>

              {question.type === "text" && (
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] p-2.5 text-[13.5px] text-white focus:border-[#6C47FF] focus:outline-none"
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
                  }
                />
              )}

              {question.type === "yes_no" && (
                <div className="flex gap-2">
                  {["Yes", "No"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-[13px]",
                        answers[question.id] === option
                          ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                          : "border-[#2A2A3A] text-[#A0A0B0]"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {question.type === "multiple_choice" && (
                <div className="flex flex-wrap gap-2">
                  {(question.options ?? []).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-[12.5px]",
                        answers[question.id] === option
                          ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                          : "border-[#2A2A3A] text-[#A0A0B0]"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {(question.type === "rating" || question.type === "nps") && (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: question.type === "nps" ? 11 : 5 }, (_, i) => i + (question.type === "nps" ? 0 : 1)).map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
                        className={cn(
                          "h-8 w-8 rounded-md border text-[12.5px]",
                          answers[question.id] === value
                            ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                            : "border-[#2A2A3A] text-[#A0A0B0]"
                        )}
                      >
                        {value}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onDone}
            className="text-[12.5px] text-[#A0A0B0] hover:text-white"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-[#6C47FF] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#7C5AFF] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
