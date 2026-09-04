import type { Metadata } from "next";

import { CourseDetail } from "@/components/academy/CourseDetail";

export const metadata: Metadata = { title: "Course · Academy" };
export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseDetail courseId={courseId} />;
}
