import type { Metadata } from "next";

import { TimedCommentEditor } from "@/components/admin/comments/TimedCommentEditor";

export const metadata: Metadata = { title: "Timed comments" };

export default async function CommentsPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  return <TimedCommentEditor webinarId={webinarId} />;
}
