"use client";

import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";

import type { SectionProps } from "@/components/registration-builder/BuilderSidebar";
import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { Toggle } from "@/components/registration-builder/sections/Toggle";
import { cn } from "@/lib/utils";
import type { CustomField, CustomFieldType } from "@/types";

const TYPES: { id: CustomFieldType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "dropdown", label: "Dropdown" },
  { id: "checkbox", label: "Checkbox" },
  { id: "number", label: "Number" },
];

export function FormFieldsSection({ config, update }: SectionProps) {
  const fields = (
    Array.isArray(config.custom_fields) ? config.custom_fields : []
  ) as CustomField[];

  const set = (next: CustomField[]) => update({ custom_fields: next });

  const patch = (index: number, changes: Partial<CustomField>) => {
    const next = [...fields];
    next[index] = { ...next[index], ...changes };
    set(next);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    set(next);
  };

  return (
    <>
      <div className="rounded-lg border border-surface-3 bg-surface-2 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Always asked
        </p>
        <ul className="mt-2 space-y-1 text-[12px] text-ink/70">
          <li>Full name</li>
          <li>Email address</li>
          <li>Phone number with country code</li>
          <li>GDPR consent</li>
        </ul>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="space-y-3 rounded-lg border border-surface-3 bg-surface-2 p-3"
        >
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <button
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
                className="text-ink-muted transition-colors hover:text-ink disabled:opacity-25"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === fields.length - 1}
                aria-label="Move down"
                className="text-ink-muted transition-colors hover:text-ink disabled:opacity-25"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <TextInput
              value={field.label}
              onChange={(event) => patch(index, { label: event.target.value })}
              placeholder="What is your biggest challenge?"
            />

            <button
              onClick={() => set(fields.filter((_, i) => i !== index))}
              aria-label="Remove field"
              className="shrink-0 text-ink-muted transition-colors hover:text-[#FF3B3B]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => patch(index, { type: type.id })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                  field.type === type.id
                    ? "border-accent bg-accent/15 text-ink"
                    : "border-surface-3 text-ink-muted hover:text-ink"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>

          {field.type === "dropdown" && (
            <Field label="Options" hint="one per line">
              <TextInput
                value={(field.options ?? []).join(", ")}
                onChange={(event) =>
                  patch(index, {
                    options: event.target.value
                      .split(",")
                      .map((option) => option.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Coach, Course creator, Agency"
              />
            </Field>
          )}

          <Toggle
            label="Required"
            checked={field.required}
            onChange={(value) => patch(index, { required: value })}
          />
        </div>
      ))}

      <AdminButton
        variant="secondary"
        onClick={() =>
          set([
            ...fields,
            {
              id: crypto.randomUUID(),
              type: "text",
              label: "",
              required: false,
            },
          ])
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Add custom field
      </AdminButton>
    </>
  );
}
