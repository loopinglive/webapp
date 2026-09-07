"use client";

import { useCallback, useEffect, useState } from "react";

export type InteractiveElement = {
  id: string;
  webinar_id: string;
  element_type: "hotspot" | "social_share";
  config: Record<string, unknown>;
  video_offset_seconds: number;
  duration_seconds: number;
};

export function useInteractiveElements(webinarId: string) {
  const [elements, setElements] = useState<InteractiveElement[] | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/video/interactive?webinarId=${webinarId}`, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { elements: InteractiveElement[] };
      setElements(payload.elements);
    } else {
      setElements([]);
    }
  }, [webinarId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function addElement(input: {
    elementType: "hotspot" | "social_share";
    videoOffsetSeconds: number;
    durationSeconds: number;
    config: Record<string, unknown>;
  }) {
    const response = await fetch("/api/video/interactive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinarId, ...input }),
    });
    const payload = (await response.json()) as { element?: InteractiveElement; error?: string };
    if (response.ok) await load();
    return payload;
  }

  async function removeElement(elementId: string) {
    await fetch("/api/video/interactive", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elementId, webinarId }),
    });
    await load();
  }

  return { elements, addElement, removeElement };
}
