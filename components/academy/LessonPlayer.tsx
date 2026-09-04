"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { useAcademyCourse } from "@/hooks/useAcademy";

export function LessonPlayer({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const { course, lessons, completedLessonIds, loading, markComplete } =
    useAcademyCourse(courseId);
  const [marking, setMarking] = useState(false);

  if (loading || !course) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  const lesson = lessons[index];

  if (!lesson) {
    return <div className="px-6 py-16 text-center text-[13px] text-[#A0A0B0]">Not found.</div>;
  }

  const done = completedLessonIds.includes(lesson.id);
  const next = lessons[index + 1];
  const prev = lessons[index - 1];

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 lg:px-10">
      <Link
        href={`/academy/course/${courseId}`}
        className="inline-flex items-center gap-2 text-[12.5px] text-[#A0A0B0] hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {course.title}
      </Link>

      <h1 className="mt-3 text-[19px] font-semibold text-white">{lesson.title}</h1>
      {lesson.description && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#A0A0B0]">{lesson.description}</p>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#1E1E2E] bg-black">
        {lesson.video_url ? (
          <video src={lesson.video_url} controls className="aspect-video w-full" />
        ) : (
          <div className="grid aspect-video place-items-center text-[13px] text-[#4A4A5C]">
            No video uploaded for this lesson yet.
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={async () => {
            setMarking(true);
            await markComplete(lesson.id);
            setMarking(false);
          }}
          disabled={done || marking}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12.5px] font-medium disabled:opacity-70 ${
            done
              ? "bg-[#22C55E]/15 text-[#22C55E]"
              : "bg-[#6C47FF] text-white hover:bg-[#5B39E0]"
          }`}
        >
          {marking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {done ? "Completed" : "Mark complete"}
        </button>

        <div className="flex gap-2">
          {prev && (
            <Link
              href={`/academy/course/${courseId}/lesson/${prev.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </Link>
          )}
          {next && (
            <Link
              href={`/academy/course/${courseId}/lesson/${next.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1E1E2E] px-3 text-[12.5px] text-[#A0A0B0] hover:text-white"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
