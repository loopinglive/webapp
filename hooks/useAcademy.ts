"use client";

import { useCallback, useEffect, useState } from "react";

export type Course = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  category: string;
  difficulty: string;
  estimated_minutes: number;
  is_free: boolean;
};

export type Lesson = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  position: number;
  is_preview: boolean;
};

export function useAcademyCourses() {
  const [courses, setCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetch("/api/academy/courses", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { courses: Course[] } | null) => {
          if (payload) setCourses(payload.courses);
        });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return { courses };
}

export function useAcademyCourse(courseId: string) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/academy/${courseId}`, { cache: "no-store" });
    if (response.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (response.ok) {
      const payload = (await response.json()) as {
        course: Course;
        lessons: Lesson[];
        completedLessonIds: string[];
      };
      setCourse(payload.course);
      setLessons(payload.lessons);
      setCompletedLessonIds(payload.completedLessonIds);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const markComplete = useCallback(
    async (lessonId: string) => {
      const response = await fetch("/api/academy/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { completedLessonIds: string[] };
        setCompletedLessonIds(payload.completedLessonIds);
      }
    },
    [courseId]
  );

  return { course, lessons, completedLessonIds, loading, notFound, markComplete };
}
