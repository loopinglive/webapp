"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimated_minutes: number;
  is_free: boolean;
  is_published: boolean;
};

type Lesson = {
  id: string;
  title: string;
  video_url: string | null;
  duration_seconds: number | null;
  position: number;
};

/**
 * Authoring Academy content.
 *
 * Nothing else in the product creates a course — the public side only reads
 * `is_published = true` rows, so without this the Academy stays an empty
 * shell no matter how much of the reading experience gets built.
 */
export function AcademyManager() {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [busy, setBusy] = useState(false);

  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    category: "",
    estimatedMinutes: "30",
  });
  const [newLesson, setNewLesson] = useState({ title: "", videoUrl: "" });

  const loadCourses = useCallback(async () => {
    const response = await fetch("/api/superadmin/academy/courses", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { courses: Course[] };
      setCourses(payload.courses);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadCourses(), 0);
    return () => clearTimeout(timer);
  }, [loadCourses]);

  async function loadLessons(courseId: string) {
    const response = await fetch(`/api/superadmin/academy/courses/${courseId}/lessons`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { lessons: Lesson[] };
      setLessons(payload.lessons);
    }
  }

  async function toggleExpand(courseId: string) {
    if (expanded === courseId) {
      setExpanded(null);
      return;
    }
    setExpanded(courseId);
    await loadLessons(courseId);
  }

  async function createCourse() {
    if (!newCourse.title.trim() || !newCourse.description.trim() || !newCourse.category.trim()) {
      return;
    }
    setBusy(true);
    const response = await fetch("/api/superadmin/academy/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newCourse.title,
        description: newCourse.description,
        category: newCourse.category,
        estimatedMinutes: Number(newCourse.estimatedMinutes) || 30,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error("Could not create the course.");
      return;
    }
    setNewCourse({ title: "", description: "", category: "", estimatedMinutes: "30" });
    await loadCourses();
  }

  async function togglePublish(course: Course) {
    setBusy(true);
    const response = await fetch(`/api/superadmin/academy/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !course.is_published }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      toast.error(payload.error ?? "Could not change that.");
      return;
    }
    await loadCourses();
  }

  async function deleteCourse(courseId: string) {
    if (!window.confirm("Delete this course and every lesson in it?")) return;
    await fetch(`/api/superadmin/academy/courses/${courseId}`, { method: "DELETE" });
    if (expanded === courseId) setExpanded(null);
    await loadCourses();
  }

  async function addLesson(courseId: string) {
    if (!newLesson.title.trim()) return;
    setBusy(true);
    const response = await fetch("/api/superadmin/academy/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        title: newLesson.title,
        videoUrl: newLesson.videoUrl || undefined,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error("Could not add the lesson.");
      return;
    }
    setNewLesson({ title: "", videoUrl: "" });
    await loadLessons(courseId);
  }

  async function deleteLesson(courseId: string, lessonId: string) {
    await fetch(`/api/superadmin/academy/lessons?lessonId=${lessonId}`, { method: "DELETE" });
    await loadLessons(courseId);
  }

  if (!courses) {
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6 lg:px-8">
      <section className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5">
        <h2 className="text-[13px] font-semibold text-white">New course</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={newCourse.title}
            onChange={(event) => setNewCourse((c) => ({ ...c, title: event.target.value }))}
            placeholder="Title"
            className="h-9 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
          />
          <input
            value={newCourse.category}
            onChange={(event) => setNewCourse((c) => ({ ...c, category: event.target.value }))}
            placeholder="Category, e.g. Getting Started"
            className="h-9 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
          />
        </div>
        <textarea
          value={newCourse.description}
          onChange={(event) => setNewCourse((c) => ({ ...c, description: event.target.value }))}
          placeholder="Description"
          rows={2}
          className="mt-2 w-full rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 py-2 text-[13px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={newCourse.estimatedMinutes}
            onChange={(event) =>
              setNewCourse((c) => ({ ...c, estimatedMinutes: event.target.value }))
            }
            className="h-9 w-24 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-3 text-[13px] text-white focus:outline-none"
          />
          <span className="text-[12px] text-[#6E6E80]">minutes</span>
          <button
            onClick={() => void createCourse()}
            disabled={busy}
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-[#6C47FF] px-3.5 text-[12.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
        </div>
      </section>

      <ul className="space-y-2">
        {courses.map((course) => (
          <li key={course.id} className="rounded-2xl border border-[#1E1E2E] bg-[#12121A]">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <button
                onClick={() => void toggleExpand(course.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#6E6E80] transition-transform ${
                    expanded === course.id ? "rotate-180" : ""
                  }`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] text-white">{course.title}</span>
                  <span className="block text-[11px] text-[#6E6E80]">
                    {course.category} · {course.estimated_minutes} min
                  </span>
                </span>
              </button>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-medium ${
                  course.is_published
                    ? "bg-[#22C55E]/15 text-[#22C55E]"
                    : "bg-[#1E1E2E] text-[#A0A0B0]"
                }`}
              >
                {course.is_published ? "Published" : "Draft"}
              </span>

              <button
                onClick={() => void togglePublish(course)}
                disabled={busy}
                className="shrink-0 rounded-lg border border-[#1E1E2E] px-3 py-1.5 text-[11.5px] text-[#A0A0B0] hover:text-white disabled:opacity-60"
              >
                {course.is_published ? "Unpublish" : "Publish"}
              </button>

              <button
                onClick={() => void deleteCourse(course.id)}
                aria-label={`Delete ${course.title}`}
                className="shrink-0 rounded-lg p-1.5 text-[#6E6E80] hover:text-[#FF5A5A]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {expanded === course.id && (
              <div className="border-t border-[#1E1E2E] px-4 py-3.5">
                <ul className="space-y-1.5">
                  {lessons.map((lesson, index) => (
                    <li
                      key={lesson.id}
                      className="flex items-center gap-2.5 rounded-lg bg-[#0D0D15] px-3 py-2"
                    >
                      <span className="text-[11px] text-[#6E6E80]">{index + 1}.</span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-white">
                        {lesson.title}
                      </span>
                      {lesson.video_url ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                      ) : (
                        <span className="shrink-0 text-[10.5px] text-[#6E6E80]">no video</span>
                      )}
                      <button
                        onClick={() => void deleteLesson(course.id, lesson.id)}
                        aria-label={`Delete ${lesson.title}`}
                        className="shrink-0 text-[#6E6E80] hover:text-[#FF5A5A]"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                  {lessons.length === 0 && (
                    <li className="text-[12px] text-[#6E6E80]">No lessons yet.</li>
                  )}
                </ul>

                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={newLesson.title}
                    onChange={(event) =>
                      setNewLesson((l) => ({ ...l, title: event.target.value }))
                    }
                    placeholder="Lesson title"
                    className="h-8 flex-1 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
                  />
                  <input
                    value={newLesson.videoUrl}
                    onChange={(event) =>
                      setNewLesson((l) => ({ ...l, videoUrl: event.target.value }))
                    }
                    placeholder="Video URL (optional)"
                    className="h-8 flex-1 rounded-lg border border-[#1E1E2E] bg-[#0D0D15] px-2.5 text-[12px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
                  />
                  <button
                    onClick={() => void addLesson(course.id)}
                    disabled={busy}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1E1E2E] px-2.5 text-[12px] text-white hover:bg-[#2A2A3A] disabled:opacity-60"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {courses.length === 0 && (
          <p className="text-[13px] text-[#6E6E80]">No courses yet — create one above.</p>
        )}
      </ul>
    </div>
  );
}
