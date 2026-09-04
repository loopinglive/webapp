"use client";

import { Loader2 } from "lucide-react";

import { CourseCard } from "@/components/academy/CourseCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAcademyCourses } from "@/hooks/useAcademy";

export function AcademyHome() {
  const { courses } = useAcademyCourses();

  return (
    <div className="px-6 py-6 lg:px-10">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
        Loopinglive Academy
      </h1>
      <p className="mt-1 text-[13px] text-[#A0A0B0]">
        Free, for every plan. How to build a webinar that actually converts.
      </p>

      <div className="mt-6">
        {!courses ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState icon="🎓" title="Nothing published yet" description="Check back soon." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
