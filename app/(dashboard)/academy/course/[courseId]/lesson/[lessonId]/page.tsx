import type { Metadata } from "next";

import { LessonPlayer } from "@/components/academy/LessonPlayer";

export const metadata: Metadata = { title: "Lesson · Academy" };
export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  return <LessonPlayer courseId={courseId} lessonId={lessonId} />;
}
