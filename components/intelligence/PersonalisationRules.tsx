"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";

import { AdminButton, Field, TextInput } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { usePersonalisationRules, type PersonalisationRule } from "@/hooks/usePersonalisationRules";
import type { Condition, ConditionField, ConditionOperator, PersonalisationAction, PersonalisationContext } from "@/lib/intelligence/personalisation";
import { cn } from "@/lib/utils";

const FIELDS: { id: ConditionField; label: string }[] = [
  { id: "deviceType", label: "Device type" },
  { id: "countryCode", label: "Country code" },
  { id: "returningAttendee", label: "Returning attendee" },
  { id: "watchPercentage", label: "Watch percentage" },
  { id: "clickedOffer", label: "Clicked the offer" },
  { id: "utmSource", label: "UTM source" },
];

const OPERATORS: { id: ConditionOperator; label: string }[] = [
  { id: "equals", label: "equals" },
  { id: "not_equals", label: "does not equal" },
  { id: "greater_than", label: "is greater than" },
  { id: "less_than", label: "is less than" },
  { id: "contains", label: "contains" },
];

const ACTION_TYPES: { id: PersonalisationAction["type"]; label: string }[] = [
  { id: "custom_message", label: "Show a custom message" },
  { id: "alternate_headline", label: "Swap the headline" },
  { id: "tag_segment", label: "Tag into a segment" },
];

export function PersonalisationRules({ webinarId }: { webinarId: string }) {
  const { rules, loading, creating, error, createRule, toggleActive, remove, preview } =
    usePersonalisationRules(webinarId);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <SectionHeader
        title="Personalisation"
        description="Rules that match a registrant's device, source, or behaviour to a tailored message. Test a rule below before switching it on."
        action={
          <AdminButton onClick={() => setFormOpen((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            New rule
          </AdminButton>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        {formOpen && (
          <RuleForm
            creating={creating}
            onCancel={() => setFormOpen(false)}
            onCreate={async (input) => {
              const ok = await createRule(input);
              if (ok) setFormOpen(false);
            }}
          />
        )}

        {error && <p className="mb-4 text-[12.5px] text-[#FF3B3B]">{error}</p>}

        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : !rules || rules.length === 0 ? (
          <div className="grid h-32 place-items-center rounded-xl border border-dashed border-hairline text-[13px] text-ink-faint">
            No rules yet. The first one you create runs for everyone until you add conditions.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {rules.map((rule) => (
              <RuleRow key={rule.id} rule={rule} onToggle={toggleActive} onRemove={remove} />
            ))}
          </div>
        )}

        <PreviewTester onPreview={preview} />
      </div>
    </>
  );
}

function RuleRow({
  rule,
  onToggle,
  onRemove,
}: {
  rule: PersonalisationRule;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{rule.rule_name}</p>
        <p className="mt-0.5 text-[11.5px] text-ink-faint">
          {rule.conditions.length === 0
            ? "Matches everyone"
            : rule.conditions
                .map((c) => `${FIELDS.find((f) => f.id === c.field)?.label ?? c.field} ${c.operator.replace("_", " ")} ${c.value}`)
                .join(" and ")}
          {" → "}
          {rule.actions.map((a) => ACTION_TYPES.find((t) => t.id === a.type)?.label ?? a.type).join(", ")}
        </p>
      </div>
      <span className="text-[11px] tabular-nums text-ink-faint">priority {rule.priority}</span>
      <button
        onClick={() => void onToggle(rule.id, !rule.is_active)}
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors",
          rule.is_active ? "bg-[#00C851]/15 text-[#00C851]" : "bg-surface-3 text-ink-muted"
        )}
      >
        {rule.is_active ? "Active" : "Paused"}
      </button>
      <button
        onClick={() => void onRemove(rule.id)}
        className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function RuleForm({
  creating,
  onCancel,
  onCreate,
}: {
  creating: boolean;
  onCancel: () => void;
  onCreate: (input: { ruleName: string; conditions: Condition[]; actions: PersonalisationAction[]; priority: number }) => Promise<void>;
}) {
  const [ruleName, setRuleName] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([
    { field: "deviceType", operator: "equals", value: "mobile" },
  ]);
  const [actions, setActions] = useState<PersonalisationAction[]>([
    { type: "custom_message", value: "" },
  ]);
  const [priority, setPriority] = useState(0);

  const valid = ruleName.trim().length > 0 && actions.every((a) => a.value.trim().length > 0);

  return (
    <div className="mb-6 rounded-xl border border-hairline bg-surface p-4">
      <Field label="Rule name" required>
        <TextInput value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Mobile visitors from Facebook" />
      </Field>

      <div className="mt-4">
        <p className="mb-2 text-[12px] font-medium text-ink-muted">
          Conditions <span className="text-ink-faint">(all must match)</span>
        </p>
        <div className="flex flex-col gap-2">
          {conditions.map((condition, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select
                value={condition.field}
                onChange={(e) => {
                  const next = [...conditions];
                  next[index] = { ...next[index], field: e.target.value as ConditionField };
                  setConditions(next);
                }}
                className="h-10 rounded-lg border border-surface-3 bg-surface-2 px-3 text-[13px] text-ink focus:border-accent focus:outline-none"
              >
                {FIELDS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                value={condition.operator}
                onChange={(e) => {
                  const next = [...conditions];
                  next[index] = { ...next[index], operator: e.target.value as ConditionOperator };
                  setConditions(next);
                }}
                className="h-10 rounded-lg border border-surface-3 bg-surface-2 px-3 text-[13px] text-ink focus:border-accent focus:outline-none"
              >
                {OPERATORS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <TextInput
                value={String(condition.value)}
                onChange={(e) => {
                  const next = [...conditions];
                  next[index] = { ...next[index], value: e.target.value };
                  setConditions(next);
                }}
                className="h-10 w-40"
                placeholder="value"
              />
              <button
                onClick={() => setConditions(conditions.filter((_, i) => i !== index))}
                className="rounded-full p-1.5 text-ink-faint hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setConditions([...conditions, { field: "deviceType", operator: "equals", value: "" }])}
          className="mt-2 text-[12px] font-medium text-accent hover:text-accent-soft"
        >
          + Add condition
        </button>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[12px] font-medium text-ink-muted">Actions</p>
        <div className="flex flex-col gap-2">
          {actions.map((action, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select
                value={action.type}
                onChange={(e) => {
                  const next = [...actions];
                  next[index] = { ...next[index], type: e.target.value as PersonalisationAction["type"] };
                  setActions(next);
                }}
                className="h-10 rounded-lg border border-surface-3 bg-surface-2 px-3 text-[13px] text-ink focus:border-accent focus:outline-none"
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <TextInput
                value={action.value}
                onChange={(e) => {
                  const next = [...actions];
                  next[index] = { ...next[index], value: e.target.value };
                  setActions(next);
                }}
                className="h-10 flex-1 min-w-[200px]"
                placeholder="What should happen"
              />
              {actions.length > 1 && (
                <button
                  onClick={() => setActions(actions.filter((_, i) => i !== index))}
                  className="rounded-full p-1.5 text-ink-faint hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setActions([...actions, { type: "custom_message", value: "" }])}
          className="mt-2 text-[12px] font-medium text-accent hover:text-accent-soft"
        >
          + Add action
        </button>
      </div>

      <Field label="Priority" hint="Higher runs first when rules overlap" className="mt-4 max-w-[160px]">
        <TextInput
          type="number"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        />
      </Field>

      <div className="mt-5 flex items-center gap-2">
        <AdminButton
          disabled={!valid || creating}
          onClick={() => void onCreate({ ruleName, conditions, actions, priority })}
        >
          {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create rule
        </AdminButton>
        <AdminButton variant="ghost" onClick={onCancel}>
          Cancel
        </AdminButton>
      </div>
    </div>
  );
}

function PreviewTester({
  onPreview,
}: {
  onPreview: (context: PersonalisationContext) => Promise<{ ruleId: string; ruleName: string; actions: PersonalisationAction[] } | null>;
}) {
  const [context, setContext] = useState<PersonalisationContext>({
    deviceType: "mobile",
    countryCode: "US",
    returningAttendee: false,
    watchPercentage: 50,
    clickedOffer: false,
    utmSource: "facebook",
  });
  const [result, setResult] = useState<{ ruleId: string; ruleName: string; actions: PersonalisationAction[] } | null | undefined>(
    undefined
  );
  const [testing, setTesting] = useState(false);

  async function run() {
    setTesting(true);
    setResult(await onPreview(context));
    setTesting(false);
  }

  return (
    <div className="mt-8 rounded-xl border border-hairline bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-accent" />
        <p className="text-[13px] font-semibold text-ink">Test against a sample visitor</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Device">
          <select
            value={context.deviceType ?? ""}
            onChange={(e) => setContext({ ...context, deviceType: e.target.value })}
            className="h-10 w-full rounded-lg border border-surface-3 bg-surface-2 px-3 text-[13px] text-ink focus:border-accent focus:outline-none"
          >
            <option value="mobile">Mobile</option>
            <option value="desktop">Desktop</option>
            <option value="tablet">Tablet</option>
          </select>
        </Field>
        <Field label="UTM source">
          <TextInput value={context.utmSource ?? ""} onChange={(e) => setContext({ ...context, utmSource: e.target.value })} />
        </Field>
        <Field label="Watch %">
          <TextInput
            type="number"
            value={context.watchPercentage}
            onChange={(e) => setContext({ ...context, watchPercentage: Number(e.target.value) })}
          />
        </Field>
      </div>

      <AdminButton variant="secondary" className="mt-3" disabled={testing} onClick={() => void run()}>
        {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Run test
      </AdminButton>

      {result !== undefined && (
        <p className="mt-3 text-[12.5px] text-[#C8C8D4]">
          {result
            ? `Matched "${result.ruleName}" → ${result.actions.map((a) => a.value).join(", ")}`
            : "No rule matched this visitor."}
        </p>
      )}
    </div>
  );
}
