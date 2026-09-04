"use client";

import Link from "next/link";
import { Check, Loader2, Play } from "lucide-react";

import { useAcademyCourse } from "@/hooks/useAcademy";
import { formatOffset } from "@/lib/utils";

export function CourseDetail({ courseId }: { courseId: string }) {
  const { course, lessons, completedLessonIds, loading, notFound } = useAcademyCourse(courseId);

  if (notFound) {
    return <div className="px-6 py-16 text-center text-[13px] text-[#A0A0B0]">Not found.</div>;
  }
  if (loading || !course) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  const doneCount = lessons.filter((lesson) => completedLessonIds.includes(lesson.id)).length;
  const pct = lessons.length > 0 ? Math.round((doneCount / lessons.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-6 lg:px-10">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6E6E80]">
        {course.category} · {course.difficulty}
      </p>
      <h1 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-white">
        {course.title}
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[#C4C4D0]">{course.description}</p>

      {lessons.length > 0 && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#1E1E2E]">
            <div
              className="h-full rounded-full bg-[#6C47FF] transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11.5px] text-[#6E6E80]">
            {doneCount} of {lessons.length} lessons complete
          </p>
        </div>
      )}

      <ul className="mt-6 space-y-1.5">
        {lessons.map((lesson, index) => {
          const done = completedLessonIds.includes(lesson.id);
          return (
            <li key={lesson.id}>
              <Link
                href={`/academy/course/${courseId}/lesson/${lesson.id}`}
                className="flex items-center gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-4 py-3 hover:border-[#6C47FF]/40"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-medium ${
                    done ? "bg-[#22C55E] text-black" : "bg-[#1E1E2E] text-[#A0A0B0]"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1 text-[13.5px] text-white">{lesson.title}</span>
                {lesson.duration_seconds && (
                  <span className="shrink-0 text-[11.5px] text-[#6E6E80]">
                    {formatOffset(lesson.duration_seconds)}
                  </span>
                )}
                <Play className="h-3.5 w-3.5 shrink-0 text-[#6E6E80]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
