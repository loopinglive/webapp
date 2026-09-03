"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronUp, Loader2, MessageCircleQuestion, Star } from "lucide-react";

import { cn } from "@/lib/utils";

type Question = {
  id: string;
  author_name: string;
  question: string;
  status: string;
  is_featured: boolean;
  upvotes: number;
};

/**
 * Q&A for attendees, alongside chat rather than inside it.
 *
 * Chat is social and disposable; a question is a request with a state. Mixing
 * them means real questions scroll away under reactions, which is the single
 * most common complaint about webinar chat.
 */
export function QuestionPanel({
  webinarId,
  registrantId,
}: {
  webinarId: string;
  registrantId: string | null;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/live/${webinarId}/questions`, {
      cache: "no-store",
    });
    if (response.ok) {
      const data = (await response.json()) as { questions: Question[] };
      setQuestions(data.questions);
    }
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    const poll = setInterval(() => void load(), 10_000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [load]);

  async function ask() {
    if (!registrantId || draft.trim().length < 3) return;
    setSending(true);
    setError(null);

    const response = await fetch(`/api/live/${webinarId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrantId, question: draft }),
    });

    const payload = (await response.json()) as { error?: string };
    setSending(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not send that.");
      return;
    }

    setDraft("");
    await load();
  }

  async function upvote(questionId: string) {
    if (!registrantId || voted.has(questionId)) return;

    // Optimistic: the vote is one row with a primary key that makes a repeat
    // a no-op, so there is nothing to roll back.
    setVoted((current) => new Set(current).add(questionId));
    setQuestions((current) =>
      current.map((q) => (q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q))
    );

    await fetch(`/api/live/${webinarId}/questions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action: "upvote", registrantId }),
    });
  }

  const featured = questions.find((q) => q.is_featured);

  return (
    <div className="flex min-h-0 flex-col">
      {featured && (
        <div className="border-b border-[#6C47FF]/30 bg-[#6C47FF]/10 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6BFF]">
            <Star className="h-3 w-3" />
            Being answered now
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-white">
            {featured.question}
          </p>
          <p className="mt-0.5 text-[11.5px] text-[#A0A0B0]">— {featured.author_name}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {questions.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12.5px] text-[#6E6E80]">
            No questions yet. Ask the first one.
          </p>
        ) : (
          <ul className="space-y-2">
            {questions.map((question) => (
              <li
                key={question.id}
                className={cn(
                  "flex gap-2.5 rounded-xl border p-2.5",
                  question.status === "answered"
                    ? "border-[#1E1E2E] bg-[#12121A]/50 opacity-60"
                    : "border-[#1E1E2E] bg-[#12121A]"
                )}
              >
                <button
                  onClick={() => upvote(question.id)}
                  disabled={!registrantId || voted.has(question.id)}
                  aria-label="Upvote this question"
                  className={cn(
                    "flex h-11 w-9 shrink-0 flex-col items-center justify-center rounded-lg border text-[11px] transition-colors",
                    voted.has(question.id)
                      ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]"
                      : "border-[#1E1E2E] text-[#6E6E80] hover:text-white",
                    "disabled:cursor-default"
                  )}
                >
                  <ChevronUp className="h-3 w-3" />
                  <span className="tabular-nums">{question.upvotes}</span>
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-relaxed text-[#D4D4DE]">
                    {question.question}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6E6E80]">
                    {question.author_name}
                    {question.status === "answered" && (
                      <span className="ml-2 text-[#00C851]">answered</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-[#1E1E2E] p-3">
        {error && <p className="mb-2 text-[11.5px] text-[#FF6B6B]">{error}</p>}

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void ask();
            }}
            maxLength={500}
            disabled={!registrantId}
            placeholder={registrantId ? "Ask a question…" : "Register to ask"}
            className="h-10 flex-1 rounded-full border border-[#1E1E2E] bg-[#0D0D15] px-4 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={ask}
            disabled={sending || draft.trim().length < 3 || !registrantId}
            aria-label="Send question"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#6C47FF] text-white hover:bg-[#7C5AFF] disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircleQuestion className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
