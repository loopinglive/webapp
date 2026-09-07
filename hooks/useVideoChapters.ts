"use client";

import { useCallback, useEffect, useState } from "react";

export type VideoChapter = {
  id: string;
  webinar_id: string;
  title: string;
  start_seconds: number;
  end_seconds: number;
  description: string | null;
};

export function useVideoChapters(webinarId: string) {
  const [chapters, setChapters] = useState<VideoChapter[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/video/chapters?webinarId=${webinarId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { chapters: VideoChapter[] };
      setChapters(payload.chapters);
    } else {
      setChapters([]);
    }
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function addChapter(input: { title: string; startSeconds: number; endSeconds: number; description?: string }) {
    const response = await fetch("/api/video/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, ...input }),
    });
    const payload = (await response.json()) as { chapter?: VideoChapter; error?: string };
    if (response.ok) await load();
    return payload;
  }

  async function removeChapter(chapterId: string) {
    await fetch("/api/video/chapters", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, webinarId }),
    });
    await load();
  }

  return { chapters, addChapter, removeChapter, reload: load };
}
