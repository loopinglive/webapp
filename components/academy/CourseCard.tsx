import Link from "next/link";
import { Clock } from "lucide-react";

import type { Course } from "@/hooks/useAcademy";

const DIFFICULTY_COLOUR: Record<string, string> = {
  beginner: "#22C55E",
  intermediate: "#F5A623",
  advanced: "#FF5A5A",
};

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/academy/course/${course.id}`}
      className="group block overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors hover:border-accent/40"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-void">
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-surface-3">
            <span className="text-[11px] uppercase tracking-[0.14em]">{course.category}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: DIFFICULTY_COLOUR[course.difficulty] ?? "#A0A0B0" }}
          />
          <span className="text-[10.5px] capitalize text-ink-faint">{course.difficulty}</span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[14px] font-medium text-ink">
          {course.title}
        </h3>
        <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-faint">
          <Clock className="h-3 w-3" />
          {course.estimated_minutes} min
        </p>
      </div>
    </Link>
  );
}
