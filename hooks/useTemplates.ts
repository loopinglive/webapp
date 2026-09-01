"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { TEMPLATE_BY_KEY, type TriggerType } from "@/lib/messaging/defaults";
import type { MessageChannel, MessageTemplateRow } from "@/types/database";

export function useTemplates(webinarId: string) {
  const [templates, setTemplates] = useState<MessageTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [trigger, setTrigger] = useState<TriggerType>("pre");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [channel, setChannel] = useState<MessageChannel>("email");

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/admin/automation/templates?webinarId=${webinarId}`,
      { cache: "no-store" }
    );
    if (response.ok) {
      const payload = (await response.json()) as {
        templates: MessageTemplateRow[];
      };
      setTemplates(payload.templates);
    }
    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    // Fetch on mount — the data lives on the server, not in React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  /** Template keys in this trigger group, in the order they fire. */
  const keys = useMemo(() => {
    const inGroup = templates.filter((t) => t.trigger_type === trigger);
    const unique = [...new Set(inGroup.map((t) => t.template_key))];
    // Ordered by when they fire, so the list reads as a timeline.
    return unique.sort(
      (a, b) =>
        (TEMPLATE_BY_KEY.get(a)?.offsetHours ?? 0) -
        (TEMPLATE_BY_KEY.get(b)?.offsetHours ?? 0)
    );
  }, [templates, trigger]);

  // Keep a valid selection whenever the group changes.
  const activeKey = selectedKey && keys.includes(selectedKey) ? selectedKey : keys[0];

  const channelsForKey = useMemo(
    () =>
      templates
        .filter((t) => t.template_key === activeKey)
        .map((t) => t.channel),
    [templates, activeKey]
  );

  const activeChannel = channelsForKey.includes(channel)
    ? channel
    : (channelsForKey[0] ?? "email");

  const selected = useMemo(
    () =>
      templates.find(
        (t) => t.template_key === activeKey && t.channel === activeChannel
      ) ?? null,
    [templates, activeKey, activeChannel]
  );

  const saveTemplate = useCallback(
    async (patch: { subject?: string | null; body?: string; isActive?: boolean }) => {
      if (!selected) return false;
      setIsSaving(true);

      // Optimistic so the editor never feels laggy.
      setTemplates((current) =>
        current.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                ...(patch.subject !== undefined && { subject: patch.subject }),
                ...(patch.body !== undefined && { body: patch.body }),
                ...(patch.isActive !== undefined && { is_active: patch.isActive }),
              }
            : t
        )
      );

      const response = await fetch("/api/admin/automation/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selected.id, ...patch }),
      });

      setIsSaving(false);
      if (!response.ok) {
        await load();
        return false;
      }
      return true;
    },
    [selected, load]
  );

  return {
    templates,
    loading,
    trigger,
    setTrigger,
    keys,
    activeKey,
    selectTemplate: setSelectedKey,
    channelsForKey,
    activeChannel,
    setChannel,
    selected,
    saveTemplate,
    isSaving,
    refresh: load,
  };
}
