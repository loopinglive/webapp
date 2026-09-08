"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";
import type { PluginInstallation } from "@/hooks/usePlugins";

/** Schema-driven form, built from the plugin's own settings_schema — one field type per manifest entry. */
export function PluginSettings({
  installation,
  onClose,
}: {
  installation: PluginInstallation;
  onClose: () => void;
}) {
  const toast = useToast();
  const schema = installation.plugin?.manifest?.settings_schema ?? {};
  const [values, setValues] = useState<Record<string, unknown>>({ ...installation.settings });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/plugins/install", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ installationId: installation.id, settings: values }),
    });
    setSaving(false);

    if (!response.ok) {
      toast.error("Could not save settings.");
      return;
    }
    toast.success("Settings saved.");
    onClose();
  }

  const entries = Object.entries(schema);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">{installation.plugin?.name} settings</h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-faint hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink-faint">This plugin has no configurable settings.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {entries.map(([key, field]) => (
              <label key={key} className="block">
                <span className="text-[12px] text-ink-muted">{field.label}</span>
                {field.type === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(values[key] ?? field.default ?? false)}
                    onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.checked }))}
                    className="mt-1.5 block h-4 w-4 accent-accent"
                  />
                ) : field.type === "select" || field.type === "multiselect" ? (
                  <select
                    multiple={field.type === "multiselect"}
                    value={(values[key] as string) ?? (field.default as string) ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [key]:
                          field.type === "multiselect"
                            ? Array.from(event.target.selectedOptions, (option) => option.value)
                            : event.target.value,
                      }))
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-void px-3 text-[13px] text-ink"
                  >
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    value={(values[key] as string | number) ?? (field.default as string | number) ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [key]: field.type === "number" ? Number(event.target.value) : event.target.value,
                      }))
                    }
                    className="mt-1.5 h-10 w-full rounded-lg border border-hairline bg-void px-3 text-[13px] text-ink"
                  />
                )}
              </label>
            ))}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}
