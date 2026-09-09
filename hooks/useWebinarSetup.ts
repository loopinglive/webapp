"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Webinar, WebinarSetupPayload } from "@/types";

type Editable = Partial<{
  title: string;
  description: string;
  topic: string;
  offerDescription: string;
  webinarContext: string;
  keyTalkingPoints: string;
  objectionNotes: string;
  broadcastLabel: string;
  showRecordedNotice: boolean;
}>;

const AUTOSAVE_DELAY_MS = 2000;

/**
 * The setup shell's state: the webinar, its checklist, and a debounced save.
 *
 * Edits land locally straight away and reach the server two seconds after the
 * host stops typing, so a long personality brief is one request rather than
 * three hundred.
 *
 * Autosave alone was not enough, though: a spinner that appears for a moment
 * and vanishes gives a host no way to tell whether their work is safe, and no
 * way to make it safe on demand. So the debounce is now a safety net behind an
 * explicit Save — isDirty and lastSavedAt drive a control that says which of
 * the two states you are in, and saveNow lets you settle it yourself.
 */
export function useWebinarSetup(webinarId: string) {
  const [data, setData] = useState<WebinarSetupPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Editable>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/webinar/${webinarId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as WebinarSetupPayload & {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Could not load this webinar.");
        return;
      }
      setData(payload);
      setError(null);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [webinarId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const flush = useCallback(async () => {
    // A manual save cancels the pending debounce, so clicking Save while the
    // timer is still counting sends one request rather than two.
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/webinar/${webinarId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        // Put the edits back so a failed save can be retried rather than lost.
        pending.current = { ...patch, ...pending.current };
        setError(payload.error ?? "Those changes did not save.");
      } else {
        setError(null);
        setIsDirty(Object.keys(pending.current).length > 0);
        setLastSavedAt(Date.now());
      }
    } catch {
      pending.current = { ...patch, ...pending.current };
      setError("Those changes did not save.");
    } finally {
      setIsSaving(false);
    }
  }, [webinarId]);

  const updateWebinar = useCallback(
    (patch: Editable) => {
      setData((current) =>
        current
          ? { ...current, webinar: { ...current.webinar, ...toRow(patch) } }
          : current
      );

      pending.current = { ...pending.current, ...patch };
      setIsDirty(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush]
  );

  // Never lose the last couple of seconds of typing on navigation.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    },
    [flush]
  );

  // Closing the tab kills the pending request with it, so the browser's own
  // "leave site?" prompt is the only thing that can stop that.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  // Ctrl/Cmd+S saves, because that is what everyone's hands already do.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void flush();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush]);

  return {
    webinar: data?.webinar ?? null,
    checklist: data?.checklist ?? null,
    counts: data?.counts ?? null,
    updateWebinar,
    saveNow: flush,
    refresh: load,
    isLoading: loading,
    isSaving,
    isDirty,
    lastSavedAt,
    error,
  };
}

/** Form field names to their database columns, for the optimistic update. */
function toRow(patch: Editable): Partial<Webinar> {
  const row: Partial<Webinar> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.topic !== undefined) row.topic = patch.topic;
  if (patch.offerDescription !== undefined) {
    row.offer_description = patch.offerDescription;
  }
  if (patch.webinarContext !== undefined) row.webinar_context = patch.webinarContext;
  if (patch.keyTalkingPoints !== undefined) {
    row.key_talking_points = patch.keyTalkingPoints;
  }
  if (patch.objectionNotes !== undefined) row.objection_notes = patch.objectionNotes;
  if (patch.broadcastLabel !== undefined) row.broadcast_label = patch.broadcastLabel;
  if (patch.showRecordedNotice !== undefined) {
    row.show_recorded_notice = patch.showRecordedNotice;
  }
  return row;
}
